# Replacement showcase source

This is the surrounding React/Vite demo composition. The components and styles imported from the public Cojeev registry were not edited. Install the eight components listed in the [showcase record](../../2026-09-16-pr-11899-showcase.md), retain the generated foundation imports in `src/index.css`, and replace the generated demo with these files. All controls act on local demonstration state; the music label does not imply audio playback or persistence.

## `src/App.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { MotionDrawer } from "@/components/ui/motion-drawer";
import "./showcase.css";
function Mark() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M58 9C77 10 87 27 86 45C84 66 63 87 43 86C25 85 10 71 10 52C10 33 36 7 58 9ZM56 30C47 27 35 36 31 47C26 60 32 70 40 69C52 68 64 54 65 43C66 37 62 32 56 30Z"
      />
    </svg>
  );
}
function Brand() {
  return (
    <span className="brand">
      <Mark />
      <span>00h</span>
      <small>by Cojeev</small>
    </span>
  );
}
const chapters = ["Small details", "A little depth", "After hours"];
export default function App() {
  const [scene, setScene] = useState(0),
    [dark, setDark] = useState(false),
    [checked, setChecked] = useState(false),
    [focus, setFocus] = useState(false),
    [volume, setVolume] = useState([36]),
    [saved, setSaved] = useState(false),
    [open, setOpen] = useState(false);
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.dataset.mode = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (cursor.current) {
        cursor.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
        cursor.current.style.opacity = "1";
      }
    };
    const down = () => cursor.current?.classList.add("is-down"),
      up = () => cursor.current?.classList.remove("is-down");
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
    };
  }, []);
  function go(index: number) {
    setOpen(false);
    setScene(index);
    setDark(index === 2);
  }
  return (
    <div className="showcase" data-scene={scene}>
      <header className="masthead">
        <Brand />
        <span className="masthead-note">
          React components. A little more human.
        </span>
        <button
          className="theme-toggle"
          aria-label="Toggle dark mode"
          onClick={() => {
            setDark(!dark);
            if (scene !== 1) setScene(dark ? 0 : 2);
          }}
        >
          <AnimatedIcon name={dark ? "moon" : "sun"} size="lg" />
          <span>{dark ? "After hours" : "Daylight"}</span>
        </button>
      </header>
      {scene < 3 ? (
        <main className="stage">
          <div className="story" key={scene}>
            <span className="eyebrow">
              0{scene + 1} / {chapters[scene]}
            </span>
            <h1>
              {scene === 0 ? (
                <>
                  Small things.
                  <br />
                  <em>Big feeling.</em>
                </>
              ) : scene === 1 ? (
                <>
                  A little
                  <br />
                  <em>more depth.</em>
                </>
              ) : (
                <>
                  Same soul.
                  <br />
                  <em>After dark.</em>
                </>
              )}
            </h1>
            <p className="story-copy">
              {scene === 0
                ? "A satisfying click. A playful shape. The little details that make an interface feel alive."
                : scene === 1
                  ? "Keep the context. Open a new layer. Let every detail find its place."
                  : "Warm surfaces, thoughtful contrast, and all the character you came for."}
            </p>
            <div className="feature-label">
              <span className="feature-rule" />
              {scene === 1
                ? "Stacked motion drawer"
                : "Flower checkbox · Rocker switch · Rubber slider"}
            </div>
          </div>
          <section
            className="specimen"
            aria-label="Interactive component showcase"
          >
            <div className="studio-heading">
              <span>THE LITTLE STUDIO</span>
              <span>YOUR SPACE TO MAKE</span>
            </div>
            <div className="project-cover">
              <span className="cover-note">A NEW BEGINNING</span>
              <h2>
                Something
                <br />
                worth making.
              </h2>
              <div className="cover-bottom">
                <span>Make room for your next idea.</span>
                <span className="cover-mark">
                  <Mark />
                </span>
              </div>
            </div>
            <div className="studio-body">
              {scene === 1 ? (
                <div className="project-summary">
                  <div className="summary-heading">
                    <span className="small-label">PROJECT NOTES</span>
                    <span>01—03</span>
                  </div>
                  <h3>
                    Good ideas need
                    <br />a little room.
                  </h3>
                  <p>
                    A brief, a few references, and a place for the next thought.
                  </p>
                  <MotionDrawer
                    title="The little studio"
                    description="A working example of the stack drawer."
                    variant="stack"
                    side="end"
                    width={660}
                    open={open}
                    onOpenChange={setOpen}
                    buttonOpeningVariants="stay"
                    trigger={
                      <Button size="lg" variant="accent">
                        Open the project <AnimatedIcon name="arrow-r" />
                      </Button>
                    }
                    panels={[
                      {
                        value: "brief",
                        label: "The brief",
                        children: (
                          <div className="file-content">
                            <span className="small-label">
                              01 / THE STARTING POINT
                            </span>
                            <h3>
                              Make something
                              <br />
                              feel like you.
                            </h3>
                            <p>
                              A small space for thoughtful work. A few familiar
                              controls, with a little character of their own.
                            </p>
                            <div className="file-note">
                              Start with a feeling.
                              <br />
                              Then make it useful.
                            </div>
                            <div className="file-meta">
                              <span>THE LITTLE STUDIO</span>
                              <span>CREATIVE BRIEF</span>
                            </div>
                          </div>
                        ),
                      },
                      {
                        value: "palette",
                        label: "The palette",
                        children: (
                          <div className="file-content">
                            <span className="small-label">
                              02 / A LITTLE COLOUR
                            </span>
                            <h3>
                              Soft colour.
                              <br />
                              Clear intention.
                            </h3>
                            <p>Paper, ink, and a few well-chosen accents.</p>
                            <div className="swatches">
                              <div className="swatch pink">
                                Pink<span>01</span>
                              </div>
                              <div className="swatch olive">
                                Olive<span>02</span>
                              </div>
                              <div className="swatch blue">
                                Blue<span>03</span>
                              </div>
                              <div className="swatch yellow">
                                Yellow<span>04</span>
                              </div>
                            </div>
                          </div>
                        ),
                      },
                      {
                        value: "notes",
                        label: "The details",
                        children: (
                          <div className="file-content">
                            <span className="small-label">
                              03 / ROOM TO PLAY
                            </span>
                            <h3>
                              It's all in
                              <br />
                              the details.
                            </h3>
                            <p>Try the controls. Make them your own.</p>
                            <label className="detail-choice">
                              <Checkbox
                                shape="flower"
                                size={36}
                                defaultChecked
                              />
                              Keep a little character
                            </label>
                            <label className="detail-choice">
                              <Checkbox shape="leaf" size={36} />
                              Leave room to explore
                            </label>
                            <Button
                              size="lg"
                              variant="accent"
                              onClick={() => setOpen(false)}
                            >
                              Back to the studio <AnimatedIcon name="arrow-r" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              ) : (
                <>
                  <div className="control-row">
                    <label className="choice-label">
                      <Checkbox
                        aria-label="Make something personal"
                        shape="flower"
                        size={40}
                        checked={checked}
                        onCheckedChange={(v) => setChecked(v === true)}
                      />
                      <span>
                        Make something personal
                        <small>A good place to begin.</small>
                      </span>
                    </label>
                  </div>
                  <div className="control-row">
                    <label htmlFor="focus">
                      Find your flow
                      <small>
                        {focus
                          ? "A little space to focus."
                          : "Turn down the distractions."}
                      </small>
                    </label>
                    <Switch
                      id="focus"
                      aria-label="Find your flow"
                      appearance="rocker"
                      className="-olive"
                      checked={focus}
                      onCheckedChange={setFocus}
                    />
                  </div>
                  <div className="volume-control">
                    <div className="volume-heading">
                      <label id="volume-label">A little background music</label>
                      <output>
                        {volume[0]}
                        <small>%</small>
                      </output>
                    </div>
                    <Slider
                      aria-labelledby="volume-label"
                      thumbLabel="Background music volume"
                      appearance="rubber"
                      variant="pink"
                      value={volume}
                      onValueChange={setVolume}
                    />
                  </div>
                  <div className="studio-actions">
                    <span className="save-status" role="status">
                      {saved
                        ? "Your little space, saved."
                        : "A space that feels like you."}
                    </span>
                    <Button
                      size="lg"
                      variant="accent"
                      onClick={() => setSaved(!saved)}
                      aria-label="Save your space"
                    >
                      {saved ? "Saved" : "Make it yours"}
                      <AnimatedIcon
                        name={saved ? "check" : "arrow-r"}
                        preset={saved ? "validation" : "auto"}
                        active={saved}
                      />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      ) : (
        <main className="closing">
          <span className="eyebrow">000h BY COJEEV</span>
          <h1>
            Build something
            <br />
            <em>with character.</em>
          </h1>
          <a href="https://000h.cojeev.com">
            000h.cojeev.com <AnimatedIcon name="arrow-ur" size="lg" />
          </a>
          <p>Explore the components. Make them yours.</p>
        </main>
      )}
      <footer className="footer">
        <span>OPEN SOURCE. YOURS TO SHAPE.</span>
        <nav aria-label="Demo chapters">
          {chapters.map((chapter, index) => (
            <button
              key={chapter}
              aria-current={scene === index ? "step" : undefined}
              onClick={() => go(index)}
            >
              <i />
              {chapter}
            </button>
          ))}
          <button
            className="end-link"
            onClick={() => go(3)}
            aria-label="Show closing frame"
          >
            000h.cojeev.com ↗
          </button>
        </nav>
      </footer>
      <div className="demo-cursor" ref={cursor} aria-hidden="true">
        <svg width="28" height="32" viewBox="0 0 28 32">
          <path
            d="M3 2L24 20L14 21L10 30Z"
            fill="#171512"
            stroke="#fffaf0"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
```

## `src/showcase.css`

```css
:root {
  font-family: "DM Sans", sans-serif;
  font-synthesis: none;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
a,
label {
  -webkit-tap-highlight-color: transparent;
}
button {
  cursor: pointer;
}
.showcase {
  min-height: 100vh;
  color: var(--v-text);
  background: var(--v-canvas);
  font-family: "DM Sans", sans-serif;
  transition:
    background 0.65s,
    color 0.65s;
  padding: 0 64px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.masthead {
  height: 112px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid color-mix(in srgb, var(--v-text) 18%, transparent);
}
.brand {
  display: flex;
  align-items: center;
  font:
    600 44px/0.8 "Bricolage Grotesque",
    sans-serif;
  letter-spacing: -3px;
}
.brand > svg {
  width: 41px;
  height: 41px;
  margin-right: -2px;
}
.brand small {
  letter-spacing: 0;
  font:
    400 14px "DM Sans",
    sans-serif;
  margin: 10px 0 0 16px;
}
.masthead-note {
  font-size: 15px;
  color: var(--v-text-2);
  margin-left: -24px;
}
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: none;
  color: inherit;
  font-size: 14px;
  padding: 12px 0 12px 16px;
}
.stage {
  display: grid;
  grid-template-columns: 1fr 584px;
  gap: 66px;
  align-items: center;
  flex: 1;
  min-height: 680px;
  padding: 20px 0;
}
.story {
  animation: story-in 0.65s ease both;
}
.eyebrow,
.small-label {
  font-size: 12px;
  letter-spacing: 1.8px;
  font-weight: 600;
  text-transform: uppercase;
}
.eyebrow {
  display: block;
  margin-bottom: 32px;
  color: var(--v-text-2);
}
.story h1,
.closing h1 {
  font:
    500 84px/0.99 "Bricolage Grotesque",
    sans-serif;
  letter-spacing: -4.5px;
  margin: 0;
}
.story h1 em,
.closing h1 em {
  font-style: normal;
  color: var(--v-accent-ink);
}
.story-copy {
  font-size: 19px;
  line-height: 1.6;
  max-width: 400px;
  margin: 32px 0 36px;
  color: var(--v-text-2);
}
.feature-label {
  font-size: 12px;
  line-height: 1.8;
  color: var(--v-text-2);
  display: flex;
  align-items: center;
  gap: 14px;
  white-space: nowrap;
}
.feature-rule {
  width: 26px;
  height: 1px;
  background: currentColor;
}
.specimen {
  border: 1px solid color-mix(in srgb, var(--v-text) 18%, transparent);
  border-radius: 24px;
  background: var(--v-paper);
  overflow: hidden;
  transition:
    background 0.65s,
    border-color 0.65s;
  box-shadow: 0 18px 40px -32px #29211850;
}
.studio-heading {
  height: 50px;
  padding: 0 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.4px;
}
.studio-heading span + span {
  color: var(--v-text-2);
  font-size: 9px;
}
.project-cover {
  position: relative;
  background: var(--v-pink);
  color: var(--v-on-accent);
  padding: 28px 32px 24px;
}
.cover-note {
  font-size: 10px;
  letter-spacing: 1.7px;
  font-weight: 600;
}
.project-cover h2 {
  font:
    500 47px/0.98 "Bricolage Grotesque",
    sans-serif;
  letter-spacing: -1.8px;
  margin: 18px 0 20px;
}
.cover-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 13px;
}
.cover-mark {
  width: 58px;
  height: 58px;
  position: absolute;
  right: 34px;
  top: 87px;
  transform: rotate(14deg);
}
.cover-mark svg {
  width: 100%;
  height: 100%;
}
.studio-body {
  padding: 4px 32px 24px;
}
.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--v-text) 12%, transparent);
  min-height: 94px;
}
.control-row label {
  font-size: 17px;
  cursor: pointer;
}
.control-row small {
  display: block;
  font-size: 12px;
  color: var(--v-text-2);
  margin-top: 4px;
  font-weight: 400;
}
.choice-label {
  display: flex;
  align-items: center;
  gap: 17px;
}
.volume-control {
  padding: 19px 0 24px;
}
.volume-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 14px;
}
.volume-heading output {
  font:
    500 27px "Bricolage Grotesque",
    sans-serif;
  min-width: 62px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.volume-heading output small {
  font: 400 12px "DM Sans";
  margin-left: 3px;
}
.studio-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.save-status {
  font-size: 12px;
  color: var(--v-text-2);
  white-space: nowrap;
}
.studio-actions .v-btn {
  min-width: 170px;
}
.footer {
  height: 76px;
  flex-shrink: 0;
  border-top: 1px solid color-mix(in srgb, var(--v-text) 18%, transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  letter-spacing: 1.25px;
}
.footer nav {
  display: flex;
  align-items: center;
  gap: 24px;
}
.footer button {
  border: 0;
  background: none;
  font: 400 12px "DM Sans";
  color: var(--v-text-2);
  padding: 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--v-border);
}
.footer [aria-current] i {
  background: var(--v-accent-ink);
}
.footer [aria-current] {
  color: var(--v-text);
}
.footer .end-link {
  margin-left: 32px;
}
.project-summary {
  padding: 22px 0 6px;
}
.summary-heading {
  display: flex;
  justify-content: space-between;
  color: var(--v-text-2);
  font-size: 12px;
}
.project-summary h3 {
  font: 500 34px/1.1 "Bricolage Grotesque";
  letter-spacing: -1px;
  margin: 22px 0 14px;
}
.project-summary p {
  font-size: 15px;
  line-height: 1.55;
  color: var(--v-text-2);
  max-width: 360px;
  margin: 0 0 22px;
}
.project-summary .v-btn {
  min-width: 213px;
}
.file-content {
  padding: 20px 16px;
  font-family: "DM Sans", sans-serif;
}
.file-content h3 {
  font: 500 54px/1.03 "Bricolage Grotesque";
  letter-spacing: -2px;
  margin: 32px 0 24px;
}
.file-content > p {
  font-size: 18px;
  line-height: 1.6;
  max-width: 440px;
  color: var(--v-text-2);
  margin: 0 0 36px;
}
.file-note {
  background: var(--v-pink);
  color: var(--v-on-accent);
  padding: 40px 32px;
  border-radius: 14px;
  font: 500 33px/1.1 "Bricolage Grotesque";
  letter-spacing: -0.6px;
  margin: 40px 0;
}
.file-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--v-text-2);
}
.swatches {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 36px;
}
.swatch {
  height: 148px;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 20px;
  font-weight: 500;
  color: var(--v-on-accent);
}
.swatch span {
  font-size: 12px;
}
.pink {
  background: var(--v-pink);
}
.olive {
  background: var(--v-olive);
}
.blue {
  background: var(--v-blue);
}
.yellow {
  background: var(--v-yellow);
}
.detail-choice {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 28px 0;
  font-size: 18px;
}
.file-content > .v-btn {
  margin-top: 24px;
}
.closing {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 680px;
  animation: story-in 0.7s ease both;
}
.closing h1 {
  font-size: 94px;
}
.closing > a {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 40px;
  font-size: 24px;
  color: inherit;
  text-decoration: none;
}
.closing > p {
  color: var(--v-text-2);
  font-size: 15px;
  margin-top: 14px;
}
.demo-cursor {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 999999;
  opacity: 0;
  filter: drop-shadow(0 2px 2px #0003);
  transition: opacity 0.2s;
}
.demo-cursor svg {
  transition: transform 0.13s;
  transform-origin: 4px 4px;
}
.demo-cursor.is-down svg {
  transform: scale(0.85);
}
.recording,
.recording * {
  cursor: none !important;
}
@keyframes story-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .story,
  .closing {
    animation: none;
  }
  .showcase,
  .specimen {
    transition: none;
  }
}
@media (max-width: 1000px) {
  .showcase {
    padding: 0 28px;
  }
  .masthead-note {
    display: none;
  }
  .stage {
    grid-template-columns: 1fr;
    gap: 36px;
    padding: 40px 0;
  }
  .story h1 {
    font-size: 64px;
  }
  .story-copy {
    max-width: 540px;
    margin: 20px 0;
  }
  .specimen {
    max-width: 640px;
    width: 100%;
  }
  .footer {
    height: auto;
    padding: 20px 0;
    gap: 20px;
    flex-wrap: wrap;
  }
  .footer nav {
    gap: 16px;
    flex-wrap: wrap;
  }
  .footer .end-link {
    margin-left: 0;
  }
  .closing h1 {
    font-size: 64px;
  }
  .feature-label {
    white-space: normal;
  }
}
@media (max-width: 520px) {
  .showcase {
    padding: 0 20px;
  }
  .brand small {
    display: none;
  }
  .stage {
    padding: 32px 0;
  }
  .story h1,
  .closing h1 {
    font-size: 52px;
    letter-spacing: -2px;
  }
  .studio-body {
    padding: 0 20px 20px;
  }
  .project-cover {
    padding: 24px;
  }
  .project-cover h2 {
    font-size: 38px;
  }
  .control-row label {
    font-size: 14px;
  }
  .studio-actions {
    flex-wrap: wrap;
  }
  .studio-actions .v-btn {
    width: 100%;
  }
  .footer > span {
    display: none;
  }
  .file-content {
    padding: 12px 0;
  }
  .file-content h3 {
    font-size: 38px;
  }
}
```
