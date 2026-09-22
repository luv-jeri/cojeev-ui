"use client";

/**
 * The six-chapter assembly.
 *
 * The document is ordinary, readable HTML: each chapter is a real section with a
 * heading and a paragraph, in source order, and the page is usable with the
 * canvas absent. The WebGL layer sits behind it as a fixed backdrop and never
 * becomes the only route to a control, a label or an explanation.
 *
 * Render discipline: this component subscribes to nothing that changes per
 * frame. Values that move continuously — tension, contour amount, volume — are
 * read by the one small component that displays them, so dragging a slider
 * re-renders a control, not the document.
 *
 * Chapters, in board order:
 *   01 Invitation  — architectural, dark, one genuine control
 *   02 Daylight    — the specimen catalogue, looked at from above
 *   03 Response    — the real motion system, driven hard enough to see
 *   04 Authorship  — the contour press
 *   05 Explanation — the source, in daylight, selectable
 *   06 Invitation  — one decisive start
 */
import * as React from "react";
import Link from "next/link";
import {
  FEATURED_SPECIMEN,
  PALETTE,
  SPECIMEN_FILTERS,
  SPECIMEN_TRAYS,
  specimenFilter,
  specimenMatchesFilter,
  type SpecimenFilterId,
} from "./canonical";
import { CHAPTER_IDS, CHAPTER_MARKER, CHAPTER_TONE } from "./anchors";
import { AssemblyStage } from "./assembly-runtime";
import { CreateSeam } from "./create-seam";
import { ContourEditor, ContourSource } from "./contour-editor";
import { LiveSpecimen } from "./live-specimen";
import { SpecimenApi } from "./specimen-api";
import { SoundControls, SoundNotes } from "./sound-controls";
import { createAudioEngine, type AudioEngine } from "./audio-engine";
import { cueFor } from "./audio-bindings";
import { audioCapability } from "./audio-capability";
import {
  experience,
  readStoredContour,
  useExperienceValue,
} from "./experience-store";
import {
  FLOW_CHARACTERS,
  FLOW_DEFAULTS,
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  setFlowSettings,
  setMotionMode,
  subscribeSettings,
} from "@/registry/cojeev/motion/settings";
import { MotionControls } from "@/registry/cojeev/ui/adjuster";
import { Slider } from "@/registry/cojeev/ui/slider";
import { Switch } from "@/registry/cojeev/ui/switch";
import { installCommand, site } from "@/lib/site-config";

const CHAPTER_TITLE = [
  "An interface you can put your hand on",
  "Time to look around",
  "Concentrated physical response",
  "Change the silhouette",
  "Every object has a source",
  "Start with one component",
] as const;

/** The rail is a fixed-width column; these are short enough never to run into it. */
const CHAPTER_RAIL = [
  "Assembly",
  "Collection",
  "Response",
  "Studio",
  "Source",
  "Start",
] as const;

/**
 * The same six chapters at phone width, where the rail becomes a bottom bar and
 * every chapter gets one equal column of roughly 55px. The full labels cannot fit
 * that: "Collection" alone is wider than its column, so it clipped, and the
 * previous fix for the clipping was to hide the labels entirely and leave six
 * links named "01"–"06". These are short enough to stay inside their column and
 * still name the chapter.
 */
const CHAPTER_RAIL_SHORT = [
  "Assemble",
  "Collect",
  "Respond",
  "Shape",
  "Source",
  "Start",
] as const;

const CHAPTER_LEAD = [
  "Four controls, a specimen table, a style plate and its source, cut as one object.",
  "The same specimen, lit from above. Filter for what you actually came for, put a real one on the bench, and read its source before you install anything.",
  "Where the registry's motion system is strongest and most dangerous. Pull the ribbon and change the character; every value you move here is the value the components read.",
  "The shape language, in your hands. Blend a silhouette, take it out as an SVG or a component. This press belongs to the site, not to the registry.",
  "No texture-only code and no mystery. The plate in the 3D layer carries a summary; the selected specimen's real public API is here, extracted from the file the registry ships.",
  "You have seen it work. The install command is one line, and nothing on this page is required in order to use it.",
] as const;

function useMotionSettings() {
  return React.useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Reads tension itself so the surrounding document does not re-render per move. */
function TensionControl() {
  const tension = useExperienceValue((value) => value.tension);
  return (
    <div className="asm-control">
      <span className="asm-field__label" id="asm-tension-label">
        Ribbon tension
      </span>
      <Slider
        value={[Math.round(tension)]}
        onValueChange={(next) => {
          const value = next[0] ?? tension;
          experience.set({ tension: value });
          experience.emit({ type: "tension", intensity: value / 100 });
        }}
        thumbLabel="Ribbon tension"
        aria-labelledby="asm-tension-label"
        appearance="rubber"
      />
      <p className="asm-field__value">
        {Math.round(tension)} — the ribbon stretches; the control itself does
        not move
      </p>
    </div>
  );
}

/**
 * The registry's own motion panel is the only character control on this page: a
 * second row of the same nine characters would be a copy that could drift out of
 * agreement with the real setting. This watcher only listens, so committing a
 * character still reaches the sound and the live region.
 */
function MotionCommitWatcher() {
  const settings = useMotionSettings();
  const previous = React.useRef(settings.flow.variant);
  React.useEffect(() => {
    if (previous.current === settings.flow.variant) return;
    previous.current = settings.flow.variant;
    experience.emit({ type: "shapeCommit" });
    experience.announce(
      `${FLOW_CHARACTERS[settings.flow.variant].label} motion character applied`,
    );
  }, [settings.flow.variant]);
  return null;
}

/**
 * Whether the motion system is actually running.
 *
 * The registry silences motion through *two* independent switches —
 * `motion.mode` (the master off) and `flow.variant: "off"` (the character set to
 * none) — and `applySettings` writes zero duration when either says so. Reporting
 * only `motion.mode` would show "on" for a page that is not animating at all, so
 * the page reads the same pair the registry does.
 */
export function isMotionRunning(settings: {
  motion: { mode: string };
  flow: { variant: string };
}) {
  return settings.motion.mode !== "off" && settings.flow.variant !== "off";
}

/**
 * The page's Motion switch.
 *
 * It reads *and writes* the registry's own motion mode. The previous version read
 * `settings.motion.mode` but wrote `setFlowSettings({ variant })`, so the switch
 * was wired to a different setting from the one it displayed: clicking it left
 * `motion.mode` untouched, the control snapped back to `checked`, and the real
 * MotionControls switch elsewhere on the page disagreed with this one. Reading one
 * property and writing another is the whole defect; there is no second control
 * here to keep in step, because `setMotionMode` publishes to every subscriber.
 *
 * Turning motion off must not discard the chosen character, so the flow variant is
 * left exactly as it is — `motion.mode` is the off switch, and `FLOW_CHARACTERS`
 * keeps the selection for when it comes back on.
 */
function MotionModeControl() {
  const settings = useMotionSettings();
  return (
    <div className="asm-sound__row">
      <Switch
        /* `isMotionRunning` is the conjunction of the motion mode and the flow
         * variant, because motion is genuinely off when either one is off. But
         * this switch can only write the mode, so when a visitor has turned the
         * flow variant off the control read `false` while clicking it wrote
         * `mode: "subtle"` and announced "motion on" — a switch that visibly fails
         * to latch, and an announcement contradicted by the state beside it. The
         * checked state describes what THIS control can actually change. */
        checked={settings.motion.mode !== "off"}
        onCheckedChange={(next) => {
          /* Turning motion on must also restore the flow variant, or the switch
           * would latch while the scene stayed still for the other reason. */
          if (next) setFlowSettings({ variant: FLOW_DEFAULTS.variant });
          setMotionMode(next ? "subtle" : "off");
          /* Named from the variant this click just restored rather than from the
           * render's snapshot, which still holds the pre-click value. */
          experience.announce(
            next
              ? `${FLOW_CHARACTERS[FLOW_DEFAULTS.variant].label} motion on`
              : "Motion off. The character you chose is kept.",
          );
        }}
        aria-label="Motion"
        aria-describedby="asm-motion-mode-hint"
      />
      <span className="asm-sound__label" id="asm-motion-mode-hint">
        Motion — the sculpted switch on the panel reads the same setting
      </span>
    </div>
  );
}

function AssemblyOpenToggle() {
  const open = useExperienceValue((value) => value.layersOpen);
  return (
    <button
      type="button"
      className="asm-link"
      aria-expanded={open}
      onClick={() => {
        const next = !open;
        experience.set({ layersOpen: next });
        experience.emit({ type: next ? "layersOpen" : "layersClose" });
        experience.announce(next ? "Assembly opened" : "Assembly closed");
      }}
    >
      {open ? "Close the assembly" : "Open the assembly"}
    </button>
  );
}

/** Server-rendered still, with semantic controls registered over the same layout. */
function HeroFallback() {
  return (
    <svg
      className="asm-hero-fallback"
      viewBox="0 0 640 640"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="asm-cream" x2="1" y2="1">
          <stop stopColor="#fbf4e6" />
          <stop offset="1" stopColor="#c9beaa" />
        </linearGradient>
        <linearGradient id="asm-pink" x2="0" y2="1">
          <stop stopColor="#f5b8db" />
          <stop offset="1" stopColor="#d594b7" />
        </linearGradient>
        <filter id="asm-shadow">
          <feDropShadow dx="5" dy="10" stdDeviation="8" floodOpacity=".25" />
        </filter>
      </defs>
      <path
        d="M40 620C15 410 15 30 170-90M20 590Q400 670 665 585L710 70"
        fill="none"
        stroke="url(#asm-cream)"
        strokeWidth="62"
      />
      <g filter="url(#asm-shadow)">
        {[198, 276, 354].map((y) => (
          <rect
            key={y}
            x="420"
            y={y}
            width="208"
            height="66"
            rx="18"
            fill={PALETTE.blue}
          />
        ))}
        <rect x="104" y="470" width="334" height="124" rx="28" fill="#24211f" />
        <rect
          x="54"
          y="88"
          width="394"
          height="416"
          rx="46"
          fill="url(#asm-cream)"
        />
        <rect
          x="70"
          y="125"
          width="140"
          height="64"
          rx="32"
          fill={PALETTE.olive}
        />
        <circle cx="173" cy="157" r="26" fill={PALETTE.cream} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse
            key={angle}
            cx="358"
            cy="160"
            rx="17"
            ry="64"
            transform={`rotate(${angle} 358 160)`}
            fill={PALETTE.yellow}
          />
        ))}
        <path
          d="M112 295C-30 308 68 490-70 495"
          fill="none"
          stroke={PALETTE.pink}
          strokeWidth="9"
        />
        <rect
          x="80"
          y="270"
          width="360"
          height="108"
          rx="54"
          fill="url(#asm-pink)"
        />
        <rect
          x="95"
          y="439"
          width="310"
          height="22"
          rx="11"
          fill={PALETTE.pink}
        />
      </g>
      <text
        x="170"
        y="546"
        fill={PALETTE.blue}
        fontFamily="monospace"
        fontSize="19"
      >
        &lt;Button&gt;
      </text>
      <text
        x="193"
        y="570"
        fill={PALETTE.pink}
        fontFamily="monospace"
        fontSize="19"
      >
        Create
      </text>
    </svg>
  );
}

export function AssemblyLanding({
  componentCount,
}: {
  componentCount: number;
}) {
  const announcement = useExperienceValue((value) => value.announcement);
  const reducedMotion = usePrefersReducedMotion();

  const audio = React.useRef<AudioEngine | null>(null);
  const [chapter, setChapter] = React.useState(0);
  const [webgl, setWebgl] = React.useState<
    "pending" | "ready" | "failed" | "unavailable"
  >("pending");

  /* ------------------------------------------------------------- contour boot */
  React.useEffect(() => {
    const stored = readStoredContour();
    if (stored)
      experience.set({
        contourPreset: stored.preset,
        contourAmount: stored.amount,
        contourColor: stored.color,
      });
  }, []);

  /**
   * The store is module-level, so it outlives this mount. Without this, a
   * client-side route round trip returns to a page whose UI still shows a pressed
   * control or an enabled sound setting while the freshly created audio engine
   * holds defaults — the two then disagree until the visitor touches something.
   *
   * Declared after the audio effect above so that on unmount the engine is
   * disposed first and the store is cleared second; the reverse order would leave
   * an engine reading state nobody owns.
   */
  React.useEffect(() => () => experience.reset(), []);

  /* ------------------------------------------------- motion system mirroring */
  const settings = useMotionSettings();
  const motionRunning = isMotionRunning(settings);
  React.useEffect(() => {
    experience.set({ motionOn: motionRunning });
  }, [motionRunning]);

  React.useEffect(() => {
    experience.set({ reducedMotion });
  }, [reducedMotion]);

  /* ------------------------------------------------------------------ audio */
  /**
   * Whether this browser can produce sound at all, on its own terms.
   *
   * The switch used to be disabled whenever WebGL was not ready, which made the 3D
   * renderer a precondition for audio: a visitor without a usable GPU, or whose
   * renderer chunk failed to load, was told "Sound unavailable in this browser"
   * about a browser that could play sound perfectly well. The only question is
   * whether `AudioContext` exists.
   *
   * It starts `null` — not yet known — because the answer is only readable on the
   * client. Rendering "unavailable" during hydration and correcting it a frame
   * later would flash a limitation that is not real.
   */
  const audioSupported = React.useSyncExternalStore(
    audioCapability.subscribe,
    audioCapability.get,
    audioCapability.server,
  );

  React.useEffect(() => {
    const engine = createAudioEngine({
      mobile: window.matchMedia("(max-width: 899px)").matches,
    });
    audio.current = engine;
    return () => {
      engine.dispose();
      audio.current = null;
    };
  }, []);

  const enableSound = React.useCallback(() => {
    void audio.current?.enable().then((running) => {
      experience.set({ soundEnabled: running });
      experience.announce(
        running
          ? "Sound on. Cues are synthesised in your browser, not recorded."
          : "This browser would not start audio.",
      );
    });
  }, []);

  const disableSound = React.useCallback(() => {
    audio.current?.disable();
    experience.set({ soundEnabled: false });
  }, []);

  const setVolume = React.useCallback((value: number) => {
    audio.current?.setVolume(value);
  }, []);

  const setMusic = React.useCallback((value: boolean) => {
    audio.current?.setMusicEnabled(value);
  }, []);

  // Cues are driven by the store's event channel, never by watching DOM classes.
  // The cleanup is wrapped because `onEvent` returns `Set.delete`'s boolean, and an
  // effect destructor must return void. The boolean was never the contract.
  //
  // Which events sound and which are deliberately silent lives in
  // `audio-bindings.ts`, as a table a test can assert over — a switch here meant an
  // event with no case was simply silent, which is how `shapeSelect` and `exported`
  // came to make no sound at all.
  React.useEffect(() => {
    const unsubscribe = experience.onEvent((event) => {
      const cue = cueFor(event);
      if (cue) audio.current?.play(cue.id, cue.intensity);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  /* --------------------------------------------------- audio page lifecycle */
  React.useEffect(() => {
    /* An explicit visibility policy. Leaving the tab used to leave a tail running
     * into a context the browser was free to suspend, after which no `ended` event
     * arrives and the voice table never drains. Hidden releases everything and
     * suspends; visible resumes, without replaying what was interrupted. */
    const onVisibility = () => {
      const engine = audio.current;
      if (!engine) return;
      if (document.visibilityState === "hidden") engine.suspendForLifecycle();
      else engine.resumeFromLifecycle();
    };
    const onPageHide = () => audio.current?.suspendForLifecycle();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  const onArrive = React.useCallback(() => {
    audio.current?.play("arrive", 0.75);
  }, []);

  /* ---------------------------------------------------------------- catalogue */
  const [filter, setFilter] = React.useState<SpecimenFilterId>("essentials");
  const [specimen, setSpecimen] = React.useState(FEATURED_SPECIMEN);
  const [exampleOpen, setExampleOpen] = React.useState(false);

  const visible = SPECIMEN_TRAYS.filter((tray) =>
    specimenMatchesFilter(tray.category, filter),
  );

  const pickFilter = React.useCallback((next: SpecimenFilterId) => {
    setFilter(next);
    experience.emit({ type: "navigation" });
    experience.announce(`${specimenFilter(next).label} filter applied`);
  }, []);

  const pickSpecimen = React.useCallback((id: string) => {
    setSpecimen(id);
    experience.emit({ type: "specimenLift", id });
    experience.announce(`${id} selected`);
  }, []);

  const featured =
    SPECIMEN_TRAYS.find((tray) => tray.id === specimen) ?? SPECIMEN_TRAYS[0];

  return (
    <div
      className="asm"
      data-chapter={CHAPTER_IDS[chapter]}
      data-tone={CHAPTER_TONE[chapter]}
      data-webgl={webgl}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <AssemblyStage
        onChapter={setChapter}
        onArrive={onArrive}
        onStatus={setWebgl}
      />

      {/* The static twin of the hero object. It is always in the HTML; CSS
          decides whether it or the canvas is showing. */}
      <HeroFallback />

      {/*
        Sound lives in the shell, not in a chapter. It used to exist only inside
        Closing, so a visitor had to reach the end of the page before they could
        opt in and then scroll back to hear what they had opted into — and the
        control was disabled outright whenever WebGL was unavailable, which made an
        unrelated graphics capability a precondition for audio. Both are fixed by
        putting real, always-present controls here.

        The page still never enables sound on its own: this switch is the gesture
        the browser requires, and nothing is generated before it.
      */}
      <details className="asm-controls">
        <summary>Sound</summary>
        <SoundControls
          supported={audioSupported}
          onEnable={enableSound}
          onDisable={disableSound}
          onVolume={setVolume}
          onMusic={setMusic}
        />
      </details>

      <header className="asm-header">
        <Link href="/" className="asm-brand">
          000h<span>by Cojeev</span>
        </Link>
        <nav aria-label="Main">
          <Link href="/docs/">Components</Link>
          <Link href="/docs/installation/">Get started</Link>
          <a href={site.sourceUrl}>GitHub ↗</a>
        </nav>
      </header>
      <details className="asm-chapters">
        <summary>
          Chapters <span>＋</span>
        </summary>
        <nav aria-label="Hero chapters">
          {CHAPTER_IDS.map((id, index) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) =>
                event.currentTarget.closest("details")?.removeAttribute("open")
              }
            >
              {String(index + 1).padStart(2, "0")}{" "}
              <span>{CHAPTER_RAIL[index]}</span>
            </a>
          ))}
        </nav>
      </details>

      <nav className="asm-rail" aria-label="Chapters">
        <ol>
          {CHAPTER_IDS.map((id, index) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={index === chapter ? "true" : undefined}
                aria-label={`Chapter ${index + 1}: ${CHAPTER_RAIL[index]}`}
              >
                <span className="asm-rail__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="asm-rail__label asm-rail__label--wide">
                  {CHAPTER_RAIL[index]}
                </span>
                <span className="asm-rail__label asm-rail__label--short">
                  {CHAPTER_RAIL_SHORT[index]}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="asm-document">
        {/* The seam belongs to the Invitation chapter and must not depend on the
            renderer succeeding: once `data-webgl` has resolved — `ready`,
            `failed` or `unavailable` — the real control is on screen. It is only
            withheld while the status is `pending`, the server's "not known yet",
            which is also the value a visitor with scripts disabled keeps
            forever, and an inert button with a drag hint would be a false
            affordance there. Without WebGL the plate keeps its
            `data-measured="false"` position; the WebGL layer is never the only
            route to the chapter's one control. */}
        <CreateSeam active={chapter === 0 && webgl !== "pending"} />

        {/* 01 — Invitation ------------------------------------------------- */}
        <section
          className="asm-section asm-section--hero"
          id="hero"
          data-assembly-section="hero"
          aria-labelledby="asm-hero-title"
        >
          <div className="asm-section__body">
            <h1 id="asm-hero-title" className="asm-title">
              <span>Small parts.</span>
              <span>
                Extraordinary
                <br className="asm-title-break" /> possibilities.
              </span>
            </h1>
            <p className="asm-lead">
              {componentCount} expressive React components.
              <br />
              Motion, shape, and source you can make your own.
            </p>
            <div className="asm-actions">
              <Link className="asm-action asm-action--solid" href="/docs/">
                Explore components <span aria-hidden="true">↗</span>
              </Link>
              <Link className="asm-action" href="/docs/installation/">
                Get started
              </Link>
            </div>
            <p className="asm-play-hint">
              A little curiosity goes a long way. Press, pull, open.
            </p>
          </div>
          <p className="asm-hero-foot">
            React <span>·</span> TypeScript <span>·</span> Tailwind{" "}
            <span>·</span> shadcn <span>·</span> MIT
          </p>
          <div className="asm-hero-space" aria-hidden="true" />
        </section>

        {/* 02 — Daylight --------------------------------------------------- */}
        <section
          className="asm-section asm-section--catalogue"
          id="catalogue"
          data-assembly-section="catalogue"
          aria-labelledby="asm-catalogue-title"
        >
          <div className="asm-section__body">
            <p className="asm-marker">{CHAPTER_MARKER[1]}</p>
            <h2 id="asm-catalogue-title" className="asm-title">
              {CHAPTER_TITLE[1]}
            </h2>
            <p className="asm-lead">{CHAPTER_LEAD[1]}</p>

            <fieldset className="asm-field">
              <legend className="asm-field__label">Show</legend>
              <div className="asm-field__choices">
                {SPECIMEN_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="asm-chip"
                    aria-pressed={option.id === filter}
                    onClick={() => pickFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <ul className="asm-specimens" aria-label="Specimens on the bench">
              {visible.map((tray) => (
                <li key={tray.id}>
                  <button
                    type="button"
                    className="asm-specimen"
                    aria-pressed={tray.id === specimen}
                    onClick={() => pickSpecimen(tray.id)}
                    onMouseEnter={() =>
                      experience.emit({ type: "specimenLift", id: tray.id })
                    }
                    onMouseLeave={() =>
                      experience.emit({ type: "specimenDock", id: tray.id })
                    }
                    onFocus={() =>
                      experience.emit({ type: "specimenLift", id: tray.id })
                    }
                    onBlur={() =>
                      experience.emit({ type: "specimenDock", id: tray.id })
                    }
                  >
                    <span className="asm-specimen__label">{tray.label}</span>
                    <span className="asm-specimen__category">
                      {tray.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="asm-bench">
              <p className="asm-bench__name">{featured.label}</p>
              <p className="asm-bench__meta">
                {featured.category} · <code>{featured.id}</code>
              </p>
              <button
                type="button"
                className="asm-link"
                aria-expanded={exampleOpen}
                onClick={() => {
                  const next = !exampleOpen;
                  setExampleOpen(next);
                  experience.set({ exampleOpen: next });
                }}
              >
                {exampleOpen
                  ? "Close live example"
                  : "Mount a live React example"}
              </button>
            </div>

            {exampleOpen && (
              <LiveSpecimen
                specimen={featured.id}
                docsHref={`/docs/${featured.id}/`}
                command={installCommand(featured.id)}
              />
            )}
          </div>
        </section>

        {/* 03 — Response --------------------------------------------------- */}
        <section
          className="asm-section asm-section--motion"
          id="motion"
          data-assembly-section="motion"
          aria-labelledby="asm-motion-title"
        >
          <div className="asm-section__body">
            <p className="asm-marker">{CHAPTER_MARKER[2]}</p>
            <h2 id="asm-motion-title" className="asm-title">
              {CHAPTER_TITLE[2]}
            </h2>
            <p className="asm-lead">{CHAPTER_LEAD[2]}</p>

            <TensionControl />
            <MotionModeControl />
            <p className="asm-field__label" id="asm-character-label">
              Motion character
            </p>
            <MotionControls showPreview aria-labelledby="asm-character-label" />
            <MotionCommitWatcher />
            <AssemblyOpenToggle />

            <p className="asm-note">
              Press and tension are direct values: they are applied on the frame
              they change and are never spring-integrated. Only the material
              response — the 7% compression, the layer separation — is
              integrated, on fixed 1/120 s substeps.
            </p>
          </div>
        </section>

        {/* 04 — Authorship ------------------------------------------------- */}
        <section
          className="asm-section asm-section--shape"
          id="shape"
          data-assembly-section="shape"
          aria-labelledby="asm-shape-title"
        >
          <div className="asm-section__body">
            <p className="asm-marker">{CHAPTER_MARKER[3]}</p>
            <h2 id="asm-shape-title" className="asm-title">
              {CHAPTER_TITLE[3]}
            </h2>
            <p className="asm-lead">{CHAPTER_LEAD[3]}</p>
            <ContourEditor />
            {/*
              The contour press is site tooling, and this is its export, not a
              registry component's source. It used to sit in the Source chapter
              under the summary "Contour source", where the chapter's ownership
              claim read as if `ContourMark` were the selected component's own
              code. It lives with the press it belongs to now, named as the
              site's, while the Source chapter carries the selected component's
              real API.
            */}
            <details className="asm-sound__detail asm-site-tool" open>
              <summary>
                Site contour tool source — this site&rsquo;s own, not the
                registry
              </summary>
              <p className="asm-field__note">
                The press above belongs to this site. It is not an installable
                component and adds nothing to the catalogue; this is the React
                component its Export button writes, with the current blend
                applied.
              </p>
              <ContourSource />
            </details>
            <p className="asm-note">
              A silhouette changing identity is one authored event, not a hover
              state. The sculpted face is extruded from this exact path, so the
              preview and the object cannot disagree.
            </p>
          </div>
        </section>

        {/* 05 — Explanation ------------------------------------------------ */}
        <section
          className="asm-section asm-section--source"
          id="source"
          data-assembly-section="source"
          aria-labelledby="asm-source-title"
        >
          <div className="asm-section__body">
            <p className="asm-marker">{CHAPTER_MARKER[4]}</p>
            <h2 id="asm-source-title" className="asm-title">
              {CHAPTER_TITLE[4]}
            </h2>
            <p className="asm-lead">{CHAPTER_LEAD[4]}</p>

            <div className="asm-bench">
              <p className="asm-bench__name">{featured.label}</p>
              <p className="asm-bench__meta">
                {featured.category} · <code>{featured.id}</code>
              </p>
              <Link className="asm-link" href={`/docs/${featured.id}/`}>
                Open the {featured.id} documentation
              </Link>
            </div>

            <p className="asm-field__label" id="asm-install-label">
              Install
            </p>
            <pre
              className="asm-command"
              aria-labelledby="asm-install-label"
              tabIndex={0}
            >
              <code>{installCommand(featured.id)}</code>
            </pre>

            <SpecimenApi specimen={featured} />

            <p className="asm-note">
              The dark plate in the 3D layer carries a summary of this
              component, never the component itself. The API above is read from
              the same file the install command writes.
            </p>
          </div>
        </section>

        {/* 06 — Closing ---------------------------------------------------- */}
        <section
          className="asm-section asm-section--closing"
          id="closing"
          data-assembly-section="closing"
          aria-labelledby="asm-closing-title"
        >
          <div className="asm-section__body">
            <p className="asm-marker">{CHAPTER_MARKER[5]}</p>
            <h2 id="asm-closing-title" className="asm-title">
              {CHAPTER_TITLE[5]}
            </h2>
            <p className="asm-lead">{CHAPTER_LEAD[5]}</p>

            <pre className="asm-command" tabIndex={0}>
              <code>{installCommand(FEATURED_SPECIMEN)}</code>
            </pre>

            <div className="asm-actions">
              <Link
                className="asm-action asm-action--solid"
                href="/getting-started/"
              >
                Get started
              </Link>
              <Link className="asm-action" href="/docs/">
                Browse the catalogue
              </Link>
            </div>

            <SoundNotes />

            <p className="asm-note">
              Every control on this page is a component from the registry,
              running here before it runs in your project. The staged page is at
              its own address; the home page is unchanged.
            </p>
          </div>
        </section>
      </main>

      <p
        className="asm-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement?.text ?? ""}
      </p>
    </div>
  );
}
