"use client";

/**
 * Sound controls.
 *
 * Off by default, started only by the visitor's own gesture, and honest about
 * what the sound actually is: cues synthesised in the browser, not recorded
 * audio. Volume and mute are ordinary labelled controls, and the mute state is
 * exposed as a real pressed state rather than a colour change alone.
 */
import * as React from "react";
import { Switch } from "@/registry/cojeev/ui/switch";
import { experience } from "./experience-store";
import { CUES, CUE_IDS } from "./audio-manifest";

export function SoundControls({
  onEnable,
  onDisable,
  onVolume,
  onMusic,
  supported,
}: {
  onEnable: () => void;
  onDisable: () => void;
  onVolume: (value: number) => void;
  onMusic: (value: boolean) => void;
  /**
   * `null` means "not determined yet", which is the honest state during hydration
   * and on the server. Only an explicit `false` disables the control; treating
   * unknown as unsupported would disable it for every visitor for one frame.
   */
  supported: boolean | null;
}) {
  const soundEnabled = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().soundEnabled,
    () => false,
  );
  const musicEnabled = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().musicEnabled,
    () => false,
  );
  const volume = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().volume,
    () => 0.7,
  );

  return (
    <div className="asm-sound">
      <div className="asm-sound__row">
        <Switch
          checked={soundEnabled}
          disabled={supported === false}
          onCheckedChange={(next) => {
            if (next) onEnable();
            else onDisable();
            experience.announce(next ? "Sound on" : "Sound off");
          }}
          aria-label="Sound"
        />
        <span className="asm-sound__label">
          {supported === false ? "Sound unavailable in this browser" : "Sound"}
        </span>
      </div>

      <div className="asm-sound__row asm-sound__row--volume">
        <label className="asm-sound__label" htmlFor="asm-volume">
          Volume
        </label>
        <input
          id="asm-volume"
          className="asm-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(volume * 100)}
          disabled={!soundEnabled}
          onChange={(event) => {
            const next = Number(event.target.value) / 100;
            experience.set({ volume: next });
            onVolume(next);
          }}
        />
        <output className="asm-field__value" htmlFor="asm-volume">
          {Math.round(volume * 100)}%
        </output>
      </div>

      <div className="asm-sound__row asm-sound__row--bed">
        <Switch
          checked={musicEnabled}
          disabled={!soundEnabled}
          appearance="latch"
          onCheckedChange={(next) => {
            experience.set({ musicEnabled: next });
            onMusic(next);
          }}
          aria-label="Ambient bed"
        />
        <span className="asm-sound__label">Ambient bed</span>
      </div>

    </div>
  );
}

/**
 * What the sound actually is, in the document rather than over it.
 *
 * This used to sit inside the fixed control strip, where eleven cue descriptions
 * made the strip 189px tall — 22% of a phone screen — and the panel covered the
 * hero object it was floating above. The strip is a control now and nothing else;
 * the explanation is reading matter, so it belongs in the flow of the page where
 * it can be reached, selected and read without a control panel in the way.
 *
 * It is also deliberately *outside* the controls component: none of it depends on
 * the audio graph, so it renders on the server with no JavaScript at all.
 */
export function SoundNotes() {
  return (
    <details className="asm-sound__detail">
      <summary>What you are hearing</summary>
      <p>
        Every cue is generated in this browser with the Web Audio API — a filtered
        noise transient plus a short pitched body. No audio files are downloaded,
        nothing plays before you turn it on, and at most eight voices sound at
        once. The bed is a single seamless loop rather than a timer, so it cannot
        drift. The cues are:
      </p>
      <dl className="asm-sound__cues">
        {CUE_IDS.map((id) => (
          <div key={id}>
            <dt>{id}</dt>
            <dd>{CUES[id].intent}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
