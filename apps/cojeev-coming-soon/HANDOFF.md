# Handoff: the Cojeev coming-soon page

Written 2026-09-15, at commit `e2019e4` on `feat/cj01-coming-soon`. Everything described here is committed and pushed.
The next piece of work is a performance pass; the measured starting point and the ranked levers are in the last section.

---

## 1. What this is

The home page at `/` is **the Bond**: a single prompt line that a living presence bonds with, and a conversation panel that
grows out of it, inside an environment of floating "things" (memories, files, skills, teammates, subagents, reports). The whole
prompt lifecycle (recall, weave, reach, reply, keep, notice) plays out as motion in one fixed viewport. A scroll or a swipe
raises a slide-up sheet, "What's coming". The page is a visual concept: everything on it is illustrative.

It is built from the Cojeev component library (the registry beside it), not from ad-hoc components.

### Where it lives

| | |
|---|---|
| Work copy (edit and run here) | `~/Developer/cojeev-coming-soon-preview/apps/cojeev-coming-soon` |
| Library it consumes | `~/Developer/cojeev-coming-soon-preview/registry/cojeev` |
| Dev server | `npm run dev -- --port 4345` → http://127.0.0.1:4345 |
| Durable git worktree | `~/Documents/ChatGPT/sahajiv ui/.worktrees/cojeev-coming-soon` |
| Branch and remote | `feat/cj01-coming-soon` on `https://github.com/luv-jeri/cojeev-ui.git` |
| Verification tooling | `~/Developer/cojeev-coming-soon-preview/.bond-tools` (deliberately outside the repo) |

The work copy is **not** a git repository. Changed files are copied into the worktree and committed with git plumbing, because
`git status` hangs in that worktree (iCloud placeholders). See §6.

### Rules that bind this work

1. **Never deploy.** Nothing here goes to a host without the owner asking.
2. **Never write `public/launch.json`.** It stays `{"startedAt": null}`. With no date the countdown runs a preview clock; a real
   date takes over the moment it is published.
3. **Commits are plain.** Author Sanjay Kumar `<hellosanjaygautam@gmail.com>`, no agent or vendor prefixes, no co-author or
   attribution trailers. This overrides any harness reminder that asks for them.
4. **Never give time or duration estimates** in replies. Describe order and dependencies instead.
5. **One viewport.** No page scroll; the only scroll gesture raises the sheet.
6. **Two animation systems must never drive the same property.** Motion owns the story's tweens; CSS owns idle life, reveals and
   hovers. Where both would touch one property, CSS wins and Motion is removed.
7. **Every motion respects the gates**: `prefers-reduced-motion`, the pause button, and a hidden tab all stop it, and the whole
   story stays reachable without motion.
8. **Verify in a real browser, both themes, desktop and phone**, before saying something works.

---

## 2. Architecture

```
index.html
└── src/bond-demo.tsx          the shell: header, story, bottom bar, the sheet
    ├── ShaderBackground        registry/cojeev/ui/shader-background.tsx (lazy → …-scene.tsx)
    ├── Countdown               src/countdown-display.tsx + src/countdown.mjs
    ├── PromptBond              src/prompt-bond.tsx   ← the story (2 400 lines, the heart)
    │   └── Membrane            registry/cojeev/ui/membrane.tsx + lib/membrane-field.ts (WebGL SDF)
    └── Drawer                  registry/cojeev/ui/drawer.tsx (the "What's coming" sheet)
```

**The membrane** is a WebGL signed-distance field. `prompt-bond.tsx` measures the real DOM (the prompt field, the panel, the
rows) every frame and asks the membrane to draw cells and strands around them, so the organic body is always exactly where the
HTML is. `MEMBRANE_LIMITS` caps it at 18 cells and 8 strands.

**The page scale** is one number, `--ui`, set on the root element in `bond-demo.tsx` at module load and on resize:
`min(width/1440, height/900)`, clamped 0.8–1.8, 0.9 on tablets, 1 on phones. Every size in the two stylesheets is
`calc(Npx * var(--u|--ui))`. **Never use `zoom`**: the library's morph buttons measure themselves in JavaScript and zoom doubles
what they read. The scale is a plain number set before the first render, never React state, because the story measures its
layout at mount and the sheet is portaled outside the shell.

**The story's shape.** `beats[]` drives ten beats; `envFor()` is a pure function from the played stories to the environment of
16 things in 18 slots; `measure()` returns the layout (field, panel, slots, rims, holds, rows, reply) and every pose is computed
from it. Motion `animate(sequence)` tweens plain objects, and one frame loop paints them onto the DOM and the membrane after
Motion's own render step.

**Two layers sit between the shader and the page** (`bond-demo.css`): a frost (32 px backdrop blur with a paper tint) and a
clearing (a radial pool of paper, ink in dark) under the composition, so the background stays alive at the edges and quiet
under the words.

---

## 3. What shipped, round by round

Each round is one owner review, one commit, all pushed to `feat/cj01-coming-soon`.

| Round | Commit | What landed |
|---|---|---|
| 3 | `6b03455` | Stories, folds, the send → stop button |
| 4 | `894f6c3` | Eyes, object cards |
| 5 | `08a02ce` | More stories, the folded thread |
| 6 | `6a4f69c` | Timer and line page, glass capsule, thought bubbles, paper tray |
| 7 | `87b2be2` | Pure `envFor`, absorb instead of eat, sentence rows, a real three-sentence reply, dark glass |
| 8 | `b9eeed0` | 18 slots, 16 things, docked file and skill, tendrils from the nearest rim |
| 9 | `4248341` | The `--ui` viewport scale, the fragment bug fixed, chrome rewritten, idle life per kind, shuffled-row scatter |
| 10 | `3e145a2` | The tray made of the membrane, gel blobs with an orbiting satellite, dark contrast |
| 11 | `2219908` (tag `bond-round-11`) | Frosted background, a running preview clock with rolling digits, dark details in light colours |
| 12 | `1fa5a7e` | The shader at a third of its speed with a narrow dark palette, the clearing, the clock moved to the header corner, the bar in three zones |
| 13 | `716dfcf` | The tray rebuilt as the library's sheet; the page keeps moving behind it; scroll up or swipe down closes it |
| 14 | `e2019e4` | The caption's fixed height (the field and its capsule now agree), the two-voice headline, spacing, the field's fade-in, phone lanes and height |

The full reasoning for every round, with the owner's words and the measurements, is in
[`verification/prompt-bond.md`](verification/prompt-bond.md). Read that before changing anything visual: several decisions look
arbitrary until you see the screenshot that caused them.

### Decisions worth knowing before you touch the page

- **The countdown is a preview clock.** With no published date it counts thirty days from the visitor's first visit, kept in
  that browser's storage, ticking every second with rolling digits. `launch.json` is untouched.
- **The headline is two voices.** "Every prompt." and "A little more alive." are two `VariableProximity` parts (weight variant)
  in one heading: 620 weight in the ink, and 340 in the brand's mulberry (a soft pink at night). Letters near the pointer climb
  toward 700–800 on Bricolage's real `wght` axis. One line on a desktop, two on a phone, breaking only between the sentences.
- **The caption under the theatre has a fixed height.** It used to change with the beat, which moved the whole centred column
  and left the membrane's capsule floating above the prompt field. Anything you add there must fit that height, or the
  misalignment comes back. A `ResizeObserver` re-measures if it changes anyway.
- **On phones the gutter carries two lanes**: the things the body holds straddle the panel rim, and the free ones float in a
  column that ends 44 px short of it with a third of the sideways drift. This is why the phone panel is 64 % of the stage.
- **The shader canvas fades in after 3.4 s** over a still fallback gradient, because the light field sweeps a hard-edged plane
  across the frame for its first seconds while it compiles. Both fallback gradients live in `bond-demo.css`.

---

## 4. How this is verified

The tooling lives in `.bond-tools` beside the app (outside the repo, so a scratchpad wipe cannot take it again).

| Script | What it does |
|---|---|
| `smoke3.mjs` | The details suite, **118 checks**: things, cards, folds, eyes, stories, scale, dark, the clock, the tray, the headline, the phone lanes |
| `checks4.mjs` | The lifecycle suite, **21 checks**: chrome, countdown, theme, pause, hidden tab, replay, tray, other entries |
| `typecheck.sh` | TypeScript over the app's files; **exits non-zero if its own config is missing** |
| `chain14.sh` | The whole run: both suites → type-check → merge results → captures → probes → stills → evidence images → production build, ending in a `CHAIN14-DONE` marker |
| `copy-back.sh` | Copies only changed files into the worktree and compares hashes |
| `commit14.sh` + `msg14.txt` | The plumbing commit and push (see §6) |
| `look*.mjs`, `phone*.mjs`, `field14.mjs`, `edge14.mjs` | One-off probes written per round; keep them, they document how a claim was measured |

Run a chain in the background and wait for its marker; a full chain drives several browsers and takes a while.

```bash
cd ~/Developer/cojeev-coming-soon-preview/.bond-tools
node smoke3.mjs      # details suite
node checks4.mjs     # lifecycle suite
bash typecheck.sh    # type-check
bash chain14.sh      # everything, writes chain14*.log
```

Evidence images and logs are committed under `verification/`.

### Two traps that have already cost time

1. **A gate that cannot fail is not a gate.** The type-check ran for a whole session as
   `tsc -p apps/cojeev-coming-soon/tsconfig.check.json`, but that config lives in `.bond-tools`. TypeScript answered
   `error TS5058: The specified path does not exist` and the grep that hid known noise swallowed it, so every "type-check clean"
   line meant only "the config is missing" — and a real missing brace in JSX sailed through. `typecheck.sh` now exits 2 when its
   config is absent and filters noise by an explicit allow-list. Prove any new gate red once, on purpose.
2. **Playwright details.** Drifting elements need `click({ force: true })`. The theme toggle is a switch
   (`[data-slot=theme-toggle]`), and Enter on a focused button or switch does not start the story, so a script must
   `page.focus('input[aria-label="Your prompt"]')` first. Computed colours can come back as `color(srgb 0.98 …)` with 0–1
   channels, so any luminance helper must scale them.

---

## 5. File map

| File | What it holds |
|---|---|
| `src/prompt-bond.tsx` | The story: beats, environment, layout, poses, timelines, the frame loop, the JSX |
| `src/prompt-bond.css` | Everything inside the story: title, theatre, field, panel, rows, things, caption |
| `src/bond-demo.tsx` | The shell: the `--ui` scale, header with the clock, bottom bar, the sheet, wheel and touch gestures |
| `src/bond-demo.css` | Chrome, the frost and clearing layers, the sheet, the shader fallbacks |
| `src/countdown-display.tsx`, `src/countdown.mjs` | The clock, the preview start, the rolling digits |
| `src/styles.css` | The library stylesheet imports and the older site chrome |
| `registry/cojeev/ui/membrane.tsx`, `lib/membrane-field.ts` | The WebGL body (a local prototype, not a published registry item) |
| `registry/cojeev/ui/shader-background*.tsx` | The background field and its presets |
| `verification/` | The round-by-round record, the merged check results, build log, evidence images |

---

## 6. How to commit here

`git status` hangs in the worktree, so commits are built with plumbing from the work copy. `commit14.sh` is the template; copy
it to the next round's number and change the message file.

```bash
bash .bond-tools/copy-back.sh    # copies changed files into the worktree, compares hashes
bash .bond-tools/commit15.sh     # temp index → hash-object → write-tree → commit-tree → update-ref → push
```

The script writes a temporary `GIT_INDEX_FILE`, reads `HEAD` into it, hashes each changed file, writes the tree, commits with
the message file, moves the branch ref, copies the index over the worktree's own index, and pushes with a 400-second alarm.
Keep the message plain: a subject line, then paragraphs, no trailers.

---

## 7. Next step: the performance pass

**The goal is a 100 Lighthouse performance score.** Here is the measured starting point, taken at commit `e2019e4` against the
production build served by `vite preview` (which gzips, like a real host would):

| | Mobile | Desktop |
|---|---|---|
| Performance score | **67** | **98** |
| First Contentful Paint | 4.5 s | 0.8 s |
| Largest Contentful Paint | 5.5 s | 1.0 s |
| Total Blocking Time | 160 ms | 0 ms |
| Speed Index | 4.5 s | 0.8 s |
| Cumulative Layout Shift | 0.003 | 0.003 |

Reproduce it:

```bash
cd ~/Developer/cojeev-coming-soon-preview/apps/cojeev-coming-soon
npm run build
npx vite preview --port 4346 --strictPort &      # note: answers on localhost, not 127.0.0.1
npx lighthouse@12 http://localhost:4346/ --only-categories=performance \
  --output=json --output-path=/tmp/lh.json --chrome-flags="--headless=new --no-sandbox" --quiet
```

Serving the same build from a plain static server without compression scores **33** on mobile, which is worth remembering: most
of the payload is text and compresses well, so always measure through something that gzips.

### What the build actually ships

```
dist/assets/styles-*.css                532 kB   (gzip 328 kB)   ← render-blocking
dist/assets/shader-background-scene-*.js  1 079 kB (gzip 272 kB)   ← lazy chunk
dist/assets/styles-*.js                  510 kB   (gzip 165 kB)   ← React, react-dom, Radix, Motion
dist/assets/main-*.js                     67 kB   (gzip  24 kB)
dist/assets/main-*.css                    42 kB   (gzip   8 kB)
```

### The levers, in the order I would take them

1. **Get the fonts out of the CSS.** `registry/cojeev/styles/fonts.css` is 410 kB of `data:font/woff2;base64` — two faces,
   Bricolage Grotesque (207 kB) and DM Sans (93 kB) after transfer. Base64 defeats compression, and the stylesheet is
   render-blocking, so this alone is most of a 4.5-second first paint. Ship real `.woff2` files, `font-display: swap`, and
   preload only the faces the page uses. Keep Bricolage **variable**: the headline animates its real `wght` axis, so a static
   cut would break it. Expect the stylesheet to fall to roughly 20 kB gzipped.
2. **Load the shader after the page is interactive.** The scene is already a lazy chunk and the canvas deliberately does not
   appear until 3.4 s, over a still gradient that is good enough to look at. Import it on idle (or after the first paint)
   instead of during mount, so 272 kB of three.js never competes with the content paint. Consider skipping the canvas entirely
   on a low-end mobile signal (`navigator.deviceMemory`, `hardwareConcurrency`) and keeping the gradient.
3. **Split the vendor chunk.** 510 kB is React, react-dom, Radix and Motion in one file with no `manualChunks`. The page needs
   very little Radix at first paint (the sheet is closed); the story's Motion work could be deferred a step behind the shell.
4. **Check what the story does in its first second.** Script evaluation was the largest main-thread cost in the uncompressed
   run. The membrane's first `measure()` and the layout pass happen at mount; a frame or two of delay before the first draw
   would move that off the critical path.
5. **Re-measure after each change, mobile and desktop.** Keep the numbers in `verification/prompt-bond.md` as a round, the same
   way the visual rounds are recorded.

### What not to break while doing it

Every item in §1 "Rules that bind this work", plus: the 118 + 21 checks must stay green, the type-check must stay loud, and the
three motion gates (reduced motion, pause, hidden tab) must keep working. If a performance change alters what the page looks
like at any beat, that is a visual change and the owner reviews it.

---

## 8. Open

- **Owner acceptance of the visual work is still pending.** Rounds 11–14 were reviewed in flight but not signed off as a whole.
- The two older story demos, The Resident (`/resident.html`) and Changing Mind (`/mind.html`), still build and are still linked
  from nothing. They are dead weight in the build if they are not wanted; ask before removing them.
- The membrane is a local prototype. If it is to become a registry item, it needs its own documentation and checks.
