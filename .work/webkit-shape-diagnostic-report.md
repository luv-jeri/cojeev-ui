# WebKit ShapeScene pause diagnostic

The isolated canonical check passed locally. Browser instrumentation identified a real mobile compatibility-mouse path that leaves pointer damping active after Pause. Blocking only that pointer event removed the damping tail. This explains a plausible cause of CI's three extra render frames; the exact CI failure was not reproduced locally.

## Frozen target and bounded runs

- Main checkout revision: `d2d099d6f3d8bccc3dc81692b3a70368ffc9dc85`, no relevant dirty source diff.
- Served existing main `out` using a separately owned Vite preview server. The built component was unchanged by the later theme-only publication correction.
- ShapeScene built chunk: `out/_next/static/chunks/1k9l1_-17esdf.js`; SHA-256 `470cfcf0c9faccf8ee0175c922ac00e9a14f96bc3c959c6133cc6e9d672637c6`.
- Playwright WebKit 26.6, iPhone 13 context, 390 × 844, coarse pointer, actual locator taps. This is browser-engine emulation, not a physical iPhone test. WebKit reports zero `navigator.maxTouchPoints` in this context while actual events report pointerType `touch`.
- Only ShapeScene ran: one canonical run, one browser-instrumented run, and one causal-intervention run. No production/reference files or canonical harness were edited. All owned contexts, browsers, and servers closed.

| Run | Outcome | Pause evidence |
| --- | --- | --- |
| Canonical `--ids=shape-scene` | PASS, 3.568s, 2841 shaded colors | Draw counter 288 stable from 250ms to 550ms |
| Browser trace, original behavior | PASS | 14 render frames after Pause returned; last at +222ms; counter 324 stable at both samples |
| Browser trace, suppress only coarse-context scene mouse pointermove | PASS | One configure repaint at +2ms; no damping tail; counter 216 stable at both samples |

All three runs had zero page or console errors. Counts are draw calls, with nine calls for each rendered frame in the observed balanced scene.

## Observed cause

The canonical path first taps Code and Preview, scrolls the scene into view, and takes a canvas screenshot. In the original traced run:

1. Preview received a real touch tap at 597–598ms, followed by WebKit's mouse-type click at 606ms.
2. After the viewport scrolled, WebKit emitted `pointermove` with pointerType `mouse` onto `shape-scene-canvas` at 789ms, at the earlier tap position `(46,536)`. The probe used no mouse actions or synthetic pointer dispatch.
3. Pause received its real touch tap at 865–866ms and click at 868ms. Its configure effect requested a repaint at 871ms; the Playwright tap returned by 872ms.
4. That configure repaint ran at 877ms. Thirteen further frames came from the component's draw → requestRender recurrence, through 1094ms (+222ms after tap returned).
5. No scene ResizeObserver, IntersectionObserver, or visibility callback occurred after the Pause tap. The earlier scene size was a stable 326 × 326.

In the causal intervention, a capture listener suppressed only scene mouse pointermove on a coarse pointer context. It recorded one suppressed event at `(46,536)`, with actual touch taps unchanged. Pause then produced exactly one configure repaint and no recurring frames. The temporary listener changes the causal input, so its result is diagnostic evidence, not a production-fix verdict.

## Source mechanism and minimal correction options

Current `registry/sahajiv/ui/shape-scene.tsx`:

- Line 199 rejects pointerType `touch`, but accepts the mouse-type movement WebKit generated in this touch-only context.
- Lines 81–93 allow interactive rotation damping even when `animate=false`. This is consistent with separate `animate` and `interactive` props, but retains the unintended target from the compatibility event.
- Lines 190–195 configure Pause promptly and reset pointer rotation only for quiet/noninteractive options. The observed effect delay was a few milliseconds, not hundreds.
- Resize (96–108) and visibility/intersection paths can legitimately request repaints, but none caused this traced tail.

The narrow production correction is to prevent mouse hover tilt on devices without hover capability, while preserving explicit mouse/pen behavior on appropriate hybrid devices. For example, gate mouse pointer hover using the applicable `any-hover` capability, with consideration for live capability changes if stored. This avoids redefining the independent `animate` and `interactive` APIs merely to satisfy the test. Root owns the final production choice.

CI's observed 306 → 333 counter change equals three rendered frames. The traced +222ms damping tail sits close to the harness's fixed 250ms boundary; scheduling/input timing can plausibly push the final frames across that boundary. This inference is supported by the event and frame stacks, but CI did not capture equivalent trace data, so its exact event chronology remains unverified.

## Receipts and replay

- [Canonical result](webkit-shape-baseline/results.json)
- [Original browser event/frame trace](webkit-shape-trace/results.json)
- [Causal intervention event/frame trace](webkit-shape-suppress-compat/results.json)
- [Temporary trace generator](trace-webkit-shape.mjs)

The generator reads the canonical runner at execution time, makes a temporary instrumented copy under `.work`, and starts a separate static server for the passed checkout's `out`. Run from this worktree:

```sh
rtk proxy node .work/trace-webkit-shape.mjs /path/to/main-checkout .work/webkit-shape-trace
rtk proxy node .work/trace-webkit-shape.mjs /path/to/main-checkout .work/webkit-shape-suppress-compat --suppress-compat-mouse
```

The archived traces preserve all draw/event records, including callback-request stacks. The generated copy is disposable; production and canonical runner contents remain untouched.
