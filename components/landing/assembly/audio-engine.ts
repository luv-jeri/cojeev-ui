/**
 * The cue engine.
 *
 * Every sound is generated with the Web Audio API at the moment it is needed (or,
 * for the ambient bed, generated once and looped). There are no audio assets on
 * this route, and the interface says so.
 *
 * The contract this engine keeps:
 * - **Silent until asked.** Nothing is created or resumed before a real user
 *   gesture, so no browser autoplay policy is worked around and no audio is
 *   generated for a visitor who never enables sound.
 * - **Bounded.** A fixed voice ceiling, per-cue cooldowns, and a voice that is
 *   replaced or evicted fades out over 20–50 ms rather than being cut. A voice
 *   that is still fading still counts against the ceiling, because it is still
 *   making sound.
 * - **Scheduled ahead.** Events are placed on `AudioContext.currentTime` with a
 *   small look-ahead, so a cue is not smeared by main-thread work.
 * - **Every source ends.** Each oscillator and buffer source has an explicit stop
 *   time, and its `ended` handler frees the node. A voice can therefore be
 *   distinguished from a node that is merely unreferenced.
 * - **Held down.** A `DynamicsCompressorNode` acts as a limiter, so a burst of
 *   cues cannot clip the output.
 * - **Recoverable.** The page lifecycle is handled explicitly: hiding the tab
 *   releases every voice and suspends the context; returning resumes it without
 *   replaying anything and without leaving a half-finished tail behind.
 */
import {
  BED,
  CUES,
  FADE_RANGE,
  VOICE_LIMIT,
  type CueId,
  type VoiceSpec,
} from "./audio-manifest";

type Voice = {
  id: CueId;
  gain: GainNode;
  sources: AudioScheduledSourceNode[];
  /** When the voice would have finished on its own, in context time. */
  naturalEnd: number;
  /**
   * The stop time actually written to every source, or `null` if none is written
   * yet. Tracked so a second interruption can shorten an already-scheduled fade
   * without calling `stop()` twice, which throws on a scheduled source.
   */
  stopScheduledAt: number | null;
  /** True once an interruption has been requested; such a voice is on its way out. */
  releasing: boolean;
};

export type AudioEngine = {
  /** Must be called from a user gesture. Resolves to whether sound is running. */
  enable(): Promise<boolean>;
  disable(): void;
  setVolume(value: number): void;
  setMusicEnabled(value: boolean): void;
  play(id: CueId, intensity?: number): void;
  readonly enabled: boolean;
  /** Voices currently sounding, including any still fading out. */
  readonly activeVoices: number;
  /** Whether the ambient bed has a live source connected. */
  readonly bedRunning: boolean;
  /** Releases everything and suspends, for a hidden tab or a page hide. */
  suspendForLifecycle(): void;
  /** Resumes after `suspendForLifecycle`, if sound was on. */
  resumeFromLifecycle(): void;
  dispose(): void;
};

const LOOK_AHEAD = 0.012;

function noiseBuffer(context: AudioContext) {
  const frames = Math.floor(context.sampleRate * 0.5);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < frames; index++) {
    // Slightly smoothed white noise: brighter than pink, without a hiss top end.
    const white = Math.random() * 2 - 1;
    previous = previous * 0.28 + white * 0.72;
    data[index] = previous;
  }
  return buffer;
}

/**
 * The ambient bed, as one seamless loop.
 *
 * Generated as a single long buffer rather than played from oscillators. A
 * looping buffer needs no timer, no scheduler and no phase bookkeeping: the bed is
 * one source that starts when the visitor enables it and stops when they disable
 * it, so turning music off leaves nothing running. That property is what the
 * control promises and what a listener can verify by watching the node count.
 *
 * The content is deliberately static — a low drone with its fifth, a slow
 * tremolo, and a filtered noise layer — because it is an ambience, not a piece of
 * music, and it must sit under the cues without competing with them.
 */
function bedBuffer(context: AudioContext) {
  const seconds = BED.loopSeconds;
  const frames = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  const root = BED.rootHz;
  const fifth = root * 1.5;
  const octave = root * 2;
  const twoPi = Math.PI * 2;
  const triangle = (phase: number) => 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1;

  let lowpass = 0;
  let previousNoise = 0;
  for (let index = 0; index < frames; index++) {
    const time = index / context.sampleRate;
    /* Whole numbers of cycles across the loop, so the end meets the start with no
     * click and no audible seam. The fifth carries a quarter-cycle offset rather
     * than an arbitrary one: over `BED.loopSeconds` a quarter cycle lands on a
     * zero-crossing with matching slope, so both the value and its derivative are
     * continuous across the join. */
    const lfo = 0.5 + 0.5 * Math.sin(twoPi * BED.lfoHz * time - Math.PI / 2);
    const body =
      Math.sin(twoPi * root * time) * 0.5 +
      Math.sin(twoPi * fifth * time + Math.PI / 2) * 0.24 +
      triangle(octave * time) * 0.06;

    const white = Math.random() * 2 - 1;
    previousNoise = previousNoise * 0.7 + white * 0.3;
    // A one-pole high pass: takes the rumble off the noise layer so it reads as
    // air rather than as a second drone.
    lowpass = lowpass * 0.94 + previousNoise * 0.06;
    const air = (previousNoise - lowpass) * 0.5 * lfo;

    data[index] = body * (0.55 + 0.45 * lfo) * 0.4 + air * 0.18;
  }
  return buffer;
}

export function createAudioEngine(options: { mobile?: boolean } = {}): AudioEngine {
  const limit = options.mobile ? VOICE_LIMIT.mobile : VOICE_LIMIT.desktop;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let effects: GainNode | null = null;
  let music: GainNode | null = null;
  let limiter: DynamicsCompressorNode | null = null;
  let noise: AudioBuffer | null = null;
  let bed: AudioBuffer | null = null;
  let bedSource: AudioBufferSourceNode | null = null;
  let volume = 0.7;
  let musicEnabled = false;
  /**
   * Whether the visitor asked for sound.
   *
   * Kept separate from `enabled` because the tab lifecycle needs to pause audio
   * without forgetting that the visitor wanted it. Collapsing the two made
   * `resumeFromLifecycle` unable to run: hiding the tab set `enabled = false`, and
   * the resume path then returned early on its own guard, so sound stayed off
   * until the visitor toggled it again.
   */
  let soundOn = false;
  /** Whether the context is running right now. */
  let enabled = false;
  /** Pending "suspend once the scheduled fade has finished" timer, if any. */
  let suspendTimer: ReturnType<typeof setTimeout> | null = null;
  const voices: Voice[] = [];

  const now = () => (context ? context.currentTime : 0);

  /**
   * Voices that can still make sound — a fading tail is still audible, so it
   * counts.
   *
   * This previously filtered out `releasing` voices, which is the opposite of what
   * its own comment claimed. The consequence was not cosmetic: release() sets
   * `releasing` at the START of a fade, so a voice left the count the moment its
   * fade began and the ceiling admitted a replacement for a voice that was still
   * sounding. Instrumented, eleven voices were scheduled while this reported six.
   */
  const liveVoices = () => voices;

  /**
   * Removes a voice once it has genuinely finished and frees its gain node.
   *
   * Called from each source's `ended` handler rather than from a timer, so the
   * voice count reflects real playback instead of an estimate. A source may report
   * `ended` for a natural completion, a scheduled stop, or an interruption; all
   * three mean the same thing here.
   */
  function retire(voice: Voice) {
    const index = voices.indexOf(voice);
    if (index < 0) return;
    voices.splice(index, 1);
    voice.gain.disconnect();
  }

  /**
   * Interrupts a voice over `fade`, starting now.
   *
   * The fade is anchored to the current time, not to the voice's original end
   * point. `max(now, voice.naturalEnd)` as a stop time meant a replaced voice kept
   * sounding until its own envelope finished and only *then* faded — by which time
   * it had already been removed from the array, so the fade was scheduled on a
   * voice nothing was tracking. Anchoring at `now` is what makes replacement
   * actually immediate, and leaves the fade in the count until it truly ends.
   */
  function release(voice: Voice, fade: number) {
    const at = now();
    if (voice.releasing && voice.stopScheduledAt !== null) return;
    const stopAt = at + fade;
    voice.releasing = true;
    voice.stopScheduledAt = stopAt;
    try {
      voice.gain.gain.cancelScheduledValues(at);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), at);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      for (const source of voice.sources) source.stop(stopAt);
    } catch {
      /* Already stopped or never started: fall back to retiring it directly. */
      retire(voice);
    }
  }

  /**
   * Suspends the context once the fades that were just scheduled have finished.
   *
   * Suspending a RUNNING context halts scheduled automation exactly where it is,
   * so a `release()` fade that has been scheduled but not yet played is frozen
   * mid-ramp and resumes from that point later — the opposite of what a fade is
   * for. The delay covers the longest fade, and any resume cancels it.
   */
  function suspendWhenSilent() {
    if (!context || context.state !== "running") return;
    if (suspendTimer !== null) clearTimeout(suspendTimer);
    suspendTimer = setTimeout(() => {
      suspendTimer = null;
      if (!context || context.state !== "running" || soundOn) return;
      if (liveVoices().length > 0) return;
      void context.suspend();
    }, FADE_RANGE.max * 1000 + 120);
  }

  function prune() {
    /* A voice is removed by its own `ended` handler. This only clears entries for
     * a context that has stopped delivering events, so a suspended engine cannot
     * hold a full voice table forever. */
    const at = now();
    for (let index = voices.length - 1; index >= 0; index--) {
      const voice = voices[index];
      const horizon = voice.stopScheduledAt ?? voice.naturalEnd;
      if (horizon < at - 1) retire(voice);
    }
  }

  function buildVoice(id: CueId, spec: VoiceSpec, at: number, intensity: number) {
    if (!context || !effects || !noise) return null;
    const gain = context.createGain();
    gain.connect(effects);
    const sources: AudioScheduledSourceNode[] = [];
    const amount = Math.max(0.15, Math.min(1, intensity));
    const endsAt = at + spec.duration + 0.03;

    if (spec.kind === "thud") {
      const body = context.createOscillator();
      body.type = "sine";
      body.frequency.setValueAtTime(spec.frequency * (0.94 + amount * 0.12), at);
      body.frequency.exponentialRampToValueAtTime(
        Math.max(40, spec.frequency * spec.bend),
        at + spec.duration,
      );
      const bodyGain = context.createGain();
      bodyGain.gain.setValueAtTime(0.0001, at);
      bodyGain.gain.exponentialRampToValueAtTime(1, at + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, at + spec.duration);
      body.connect(bodyGain).connect(gain);
      body.start(at);
      /* Every source gets an explicit end. The thud body used to be started with
       * no stop at all, so it kept running past its own envelope until the whole
       * engine was disposed — a release oscillator was measured still alive with
       * no `ended` event more than sixteen seconds after a 0.22 s envelope. */
      body.stop(endsAt);
      sources.push(body);

      const burst = context.createBufferSource();
      burst.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(spec.damping, at);
      filter.Q.value = 0.9;
      const burstGain = context.createGain();
      burstGain.gain.setValueAtTime(0.0001, at);
      burstGain.gain.exponentialRampToValueAtTime(spec.noise, at + 0.003);
      burstGain.gain.exponentialRampToValueAtTime(0.0001, at + spec.duration * 0.5);
      burst.connect(filter).connect(burstGain).connect(gain);
      burst.start(at);
      burst.stop(at + spec.duration);
      sources.push(burst);
    } else if (spec.kind === "tick") {
      const burst = context.createBufferSource();
      burst.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(spec.frequency * (0.9 + amount * 0.2), at);
      filter.Q.value = spec.q;
      const burstGain = context.createGain();
      burstGain.gain.setValueAtTime(0.0001, at);
      burstGain.gain.exponentialRampToValueAtTime(spec.noise, at + 0.002);
      burstGain.gain.exponentialRampToValueAtTime(0.0001, at + spec.duration);
      burst.connect(filter).connect(burstGain).connect(gain);
      burst.start(at);
      burst.stop(at + spec.duration);
      sources.push(burst);
    } else {
      for (const direction of [1, -1]) {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          spec.frequency * (direction > 0 ? 1 : 1 + spec.detune / 100),
          at,
        );
        oscillator.detune.setValueAtTime(direction * 6, at);
        const voiceGain = context.createGain();
        voiceGain.gain.setValueAtTime(0.0001, at);
        voiceGain.gain.exponentialRampToValueAtTime(0.5, at + spec.duration * 0.35);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, at + spec.duration);
        oscillator.connect(voiceGain).connect(gain);
        oscillator.start(at);
        oscillator.stop(endsAt);
        sources.push(oscillator);
      }
    }

    const voice: Voice = {
      id,
      gain,
      sources,
      naturalEnd: endsAt,
      stopScheduledAt: null,
      releasing: false,
    };
    /* The voice leaves the table when its last source actually ends, whatever
     * caused it: a completed envelope, a scheduled stop, or an interruption. */
    let remaining = sources.length;
    const onEnded = () => {
      remaining -= 1;
      if (remaining <= 0) retire(voice);
    };
    for (const source of sources) source.addEventListener("ended", onEnded);

    return voice;
  }

  const lastPlayed = new Map<CueId, number>();

  /** Starts the bed from `bed` on the music bus, if music is on and none is live. */
  function startBed() {
    if (!context || !music || bedSource) return;
    if (!bed) bed = bedBuffer(context);
    const source = context.createBufferSource();
    source.buffer = bed;
    source.loop = true;
    source.connect(music);
    source.start(now() + LOOK_AHEAD);
    source.addEventListener("ended", () => {
      if (bedSource === source) bedSource = null;
    });
    bedSource = source;
  }

  function stopBed() {
    const source = bedSource;
    if (!source) return;
    bedSource = null;
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source.disconnect();
  }

  return {
    get enabled() {
      return enabled;
    },

    get activeVoices() {
      return liveVoices().length;
    },

    get bedRunning() {
      return bedSource !== null;
    },

    async enable() {
      /* Switching sound back on cancels a pending lifecycle suspend, so the
       * context is not torn down a moment after the visitor asked for sound. */
      if (suspendTimer !== null) {
        clearTimeout(suspendTimer);
        suspendTimer = null;
      }
      if (typeof window === "undefined") return false;
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return false;
      if (!context) {
        context = new Ctor();
        limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.22;
        master = context.createGain();
        master.gain.value = volume;
        effects = context.createGain();
        effects.gain.value = 1;
        music = context.createGain();
        /* The bed is silent until it is asked for. The music bus used to be
         * created and its gain moved, but no source was ever connected to it, so
         * the "Ambient bed" switch changed a number nothing could hear. */
        music.gain.value = BED.silentGain;
        effects.connect(master);
        music.connect(master);
        master.connect(limiter).connect(context.destination);
        noise = noiseBuffer(context);
      }
      try {
        await context.resume();
      } catch {
        return false;
      }
      enabled = context.state === "running";
      soundOn = enabled;
      if (enabled && musicEnabled) startBed();
      return enabled;
    },

    disable() {
      soundOn = false;
      enabled = false;
      /* Every voice goes through the same fade as a replacement, so muting does
       * not click. The sources stop themselves when that fade ends. */
      for (const voice of voices) release(voice, FADE_RANGE.max);
      stopBed();
      suspendWhenSilent();
    },

    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      if (master && context)
        master.gain.setTargetAtTime(volume, context.currentTime, 0.02);
    },

    setMusicEnabled(value) {
      musicEnabled = value;
      if (!context || !music) return;
      music.gain.setTargetAtTime(
        value ? BED.gain : BED.silentGain,
        context.currentTime,
        BED.fadeSeconds / 3,
      );
      /* Turning the bed off stops its source rather than only fading the bus, so
       * a disabled bed leaves no running node behind. */
      if (!value) stopBed();
      else if (enabled && context.state === "running") startBed();
    },

    play(id, intensity = 1) {
      if (!enabled || !context || context.state !== "running") return;
      const spec = CUES[id];
      const at = now();
      if (at - (lastPlayed.get(id) ?? -Infinity) < spec.cooldown / 1000) return;
      lastPlayed.set(id, at);
      prune();
      for (const replaced of spec.replaces) {
        for (const voice of voices) {
          if (voice.id === replaced) release(voice, FADE_RANGE.min + 0.02);
        }
      }
      /* The ceiling counts everything still audible, fading tails included. It
       * used to count only voices that had not been released, so a burst of
       * replacements could stack well past the stated limit. */
      while (liveVoices().length >= limit) {
        const oldest = liveVoices()[0];
        if (!oldest) break;
        release(oldest, FADE_RANGE.min);
      }
      const start = Math.max(at, at + LOOK_AHEAD);
      const voice = buildVoice(id, spec.voice, start, intensity);
      if (!voice) return;
      const peak = spec.gain * Math.max(0.15, Math.min(1, intensity));
      voice.gain.gain.setValueAtTime(peak, start);
      voices.push(voice);
    },

    suspendForLifecycle() {
      /* A hidden tab must not keep a tail running: mobile browsers throttle timers
       * and may suspend the context themselves, which would otherwise leave a
       * voice in the table with no `ended` event ever delivered. `soundOn` is left
       * alone — this is a pause, not the visitor turning sound off. */
      enabled = false;
      for (const voice of voices) release(voice, FADE_RANGE.max);
      stopBed();
      /* Same rule as `disable`: the scheduled fades must be allowed to play
       * before the context is suspended underneath them. */
      suspendWhenSilent();
    },

    resumeFromLifecycle() {
      /* Resumes only if the visitor still wants sound. It does not replay whatever
       * was interrupted: nothing is scheduled until the next real cue. */
      if (!context || !soundOn) return;
      void context.resume().then(() => {
        enabled = context?.state === "running";
        if (enabled && musicEnabled) startBed();
      });
    },

    dispose() {
      if (suspendTimer !== null) {
        clearTimeout(suspendTimer);
        suspendTimer = null;
      }
      stopBed();
      for (const voice of voices) release(voice, FADE_RANGE.min);
      voices.length = 0;
      lastPlayed.clear();
      void context?.close();
      context = null;
      master = null;
      effects = null;
      music = null;
      limiter = null;
      noise = null;
      bed = null;
      soundOn = false;
      enabled = false;
    },
  };
}
