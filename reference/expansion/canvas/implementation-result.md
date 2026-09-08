# Original SahaJiv shader field batch

Completed 2026-09-08 within the assigned new-file scope. This batch adds two original decorative backgrounds and shared WebGL infrastructure. No third-party engine, shader, wrapper, or demo asset was copied or ported. No claim of equivalence to any Canvas UI entry is made: pointer fluid simulation, HTML capture/distortion, and content refraction remain unimplemented. The 35-row source inventory retains its original inspection states.

## Files and integration

- `registry/sahajiv/lib/living-shader.ts`: original shader programs, bounded allocations, color resolution, scheduling, resource ownership, context restoration, and `useLivingShader` binding to the existing `useMotionVisibility` policy.
- `registry/sahajiv/ui/pigment-field.tsx` and `styles/pigment-field.css`: soft moving pigment densities with a static CSS artwork fallback.
- `registry/sahajiv/ui/contour-field.tsx` and `styles/contour-field.css`: moving topographic bands with a static contour fallback.
- `components/examples/shader-fields.tsx`: `PigmentFieldExample` and `ContourFieldExample`, using SahaJiv Card, Button, ToggleGroup, Slider, Label, Meta, SectionTitle, and BodySecondary. Text/actions sit on an opaque native Card so variable bright artwork cannot reduce their contrast.
- `tests/living-shader.test.ts`: numeric safety, allocation bounds, and deterministic decorative server output.

Root owns registry metadata, source-copy integration, stylesheet entry imports, docs routes, and example indexing. The UI imports shared utilities and existing motion settings through relative modules; root's registry builder must include that transitive closure. Suggested category: **Backgrounds / Shader fields**. Both are background decoration, not a content wrapper or interactive canvas viewer.

## Public API

| Prop | Values | Default |
| --- | --- | --- |
| `speed` | Finite number, clamped 0–3; zero holds still | 1 |
| `intensity` | Finite number, clamped 0–2; zero shows inherited paper | 1 |
| `tone` | `balanced`, `warm`, `cool` | Pigment: balanced; Contour: cool |
| `paused` | Boolean; freezes current artwork | false |
| Standard div props | Class/style/id/data attributes; children/ref excluded | — |

Use within a positioned parent that supplies dimensions. Place readable content on an **opaque native Card surface** above the variable artwork, leaving the shader visible around it. A text color alone cannot guarantee contrast over every animated accent. The shader surface itself is always `aria-hidden`, inert, and ignores pointer hit testing. Example:

```tsx
<div style={{ position: "relative", minHeight: 360, overflow: "hidden", borderRadius: 28 }}>
  <PigmentField tone="warm" speed={0.7} />
  <Card style={{ position: "relative", margin: 32, maxWidth: 420 }}>
    Your normal content and controls
  </Card>
</div>
```

Colors resolve from inherited `--v-paper`, `--v-pink`, `--v-blue`, `--v-olive`, and `--v-yellow`. The renderer observes theme ancestry and the existing `sahajiv:appearancechange` event. Resize uses a maximum DPR of 2, a two-million-pixel budget, and maximum side length 4096. Runtime is WebGL1 without dependencies beyond existing React and SahaJiv motion modules. It does not require WebGPU, Three.js, HTML-in-canvas, remote data, or assets.

`data-renderer` reports pending, webgl, lost, or fallback. `data-moving` reflects an available, visible animated renderer. Reduced motion, SahaJiv motion/flow off, explicit pause, speed zero, intensity zero, offscreen state, and document visibility stop ongoing draw requests. Theme/size changes can repaint one still visible frame. On context loss the static CSS artwork appears; restoration rebuilds the program and returns to the current policy. Cleanup is idempotent and deletes GL resources/listeners/observers/frame requests. It avoids forcing context loss during React Strict Mode's immediate effect remount.

## Verification

- Focused tests: **3 passed**. They were first run before the implementation existed; allocation's zero-size boundary subsequently failed and was corrected.
- Active checkout TypeScript: **passed**, with `--noEmit --incremental false`; root independently reported its integration typecheck passing.
- Targeted ESLint on the renderer, two components, example, and test: **passed** after fixing ref-bundle inference in the UI components.
- Browser runtime: **16 checks passed** using the real original programs in the existing Vite harness under React Strict Mode. Draw calls were counted by wrapping the real WebGL `drawArrays`, not by substituting the renderer. [Exact script](receipts/fields-lifecycle-code.txt), [output](receipts/fields-lifecycle-output.txt).

The runtime checks covered both programs drawing, exact draw-count stability while paused, keyboard tone/pace controls and content action, theme repaint while paused, reduced motion, SahaJiv motion off, flow off, offscreen stopping, real context loss/restoration via `WEBGL_lose_context`, unmount loop stopping, successful Strict Mode remount, 390px bounds, and unavailable-WebGL fallback preserving content/controls. The fallback test intercepted only browser context creation; normal tests exercised real GL.

**One runtime limit:** the headed automation browser did not report the page hidden when another tab was focused, so natural document-hidden behavior remains source-inspected rather than runtime proven. Both the renderer and `useMotionVisibility` have document visibility listeners. No claim of a real hidden-tab lifecycle pass is made.

Screenshots were viewed and inspected at 1200px and 390px, in light and dark themes, and with WebGL disabled. All example controls fit the narrow viewport, the sibling content remains readable, and the fallback remains visible.

- [Desktop](receipts/fields-desktop.png)
- [Dark](receipts/fields-dark.png)
- [Mobile pigment](receipts/fields-mobile.png)
- [Mobile contour](receipts/fields-mobile-contour.png)
- [Unavailable renderer](receipts/fields-fallback.png)

An integrated dark-docs review found insufficient text contrast over bright pigment. The final examples use an opaque native Card. Computed body-text contrast is **9.00:1 in light** and **8.61:1 in dark** in both examples; 390px has no horizontal overflow. [Contrast receipt](receipts/fields-surface-contrast.json), [final light](receipts/fields-surface-light.png), [final dark](receipts/fields-surface-dark.png), [final mobile pigment](receipts/fields-surface-mobile-dark.png), [final mobile contour](receipts/fields-surface-mobile-contour-dark.png). These four screenshots were visually inspected. Earlier screenshots above document the renderer lifecycle pass and are superseded for content composition.

The isolated fixture is `receipts/fields.html` / `fields-fixture.tsx`; its testing controls are not production code. Vite used the existing `apps/gate/vite.config.ts` at port 4338. Initial fixture navigation produced a favicon 404; after adding a data favicon, subsequent runs had no application errors. No dependency installation, production build, commit, push, or publication was performed by this agent.
