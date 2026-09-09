# Shared icon feedback

General `Icon` instances now respond to their nearest native button, link, summary, label, or supported role control. Feedback is a short hover/focus lift or activation press, then the SVG returns to rest. Decorative icons remain unfocusable and do not animate on their own.

## Frozen files and API

- [icon.tsx](registry/cojeev/ui/icon.tsx): `IconProps.feedback?: boolean`, default `true`. Existing SVG props, native SVG refs, consumer event handlers, `name`, `size`, and `draw` remain supported. `feedback={false}` installs no shared feedback listeners or observer.
- [animated-icon.tsx](registry/cojeev/ui/animated-icon.tsx): `AnimatedIcon` and `StateChevron` explicitly disable inner `Icon` feedback, keeping a single animation owner. `AnimatedIcon` observes disabled/inert/hidden owner and ancestor changes; explicit `active` cannot override an unavailable control.
- [check-icon-feedback.mjs](scripts/check-icon-feedback.mjs): runnable source-consumer browser fixture and assertions.
- [item-adornment.test.ts](tests/item-adornment.test.ts): all-name SVG server-rendering proof, including the final AgentChat glyphs.

No stylesheet or dependency was added. Feedback uses the existing shared choreography, Motion scalar lane, and native ref utility. The pack now exposes **136 unique names**, including `github`, `arrow-up`, `paperclip`, `square`, and `shield-check`.

## Motion and ownership

Hover/focus feedback lasts 320ms, peaking at 1.06 scale and −3° rotation. Activation lasts 160ms, peaking at .91 scale and 2° rotation. The effect uses individual CSS `scale` and `rotate` so an existing SVG transform attribute or CSS `transform` remains intact. There are no idle loops in shared feedback; an explicit `AnimatedIcon preset="spin"` retains its separate intentional interaction-driven behavior.

Pointer exit, focus exit, disabled/inert/hidden state, offscreen/document visibility, Off, and reduced motion cancel optional feedback. Cleanup removes native listeners and disconnects observers. No handler is replaced, default event prevented, or extra keyboard target introduced.

Each frame verifies ownership of the inline properties it last wrote. If a consumer changes scale or rotation during feedback, the effect stops before overwriting that update and restores only properties it still owns. Consumer 3D-axis rotation is preserved without adding the optional rotation effect.

## Focused evidence

The browser proof passed Chromium and WebKit at **360px dark and 1440px light**, four contexts total with zero page errors. It bundles the current source into a native-control fixture using the running docs stylesheet; production registry installation and site-wide integration are separate release gates.

Verified in each context:

- Hover, focus, pointer activation, role-control Enter, and link activation produce visible SVG-bound changes and settle once.
- Native SVG identity/ref cleanup, caller pointer/click handlers, CSS transform, and transform attribute survive.
- A midflight consumer update to `scale: 2` and `rotate: 20deg` survives completion. This regression failed before the ownership correction.
- Disabling a hovered/focused spinning AnimatedIcon stops its own animation and resets its transform; `active={true}` within an initially disabled button stays still.
- Shared feedback cancels after a control disables itself or its parent becomes hidden; aria-disabled controls stay still.
- `feedback={false}`, standalone decoration, AnimatedIcon, and StateChevron never acquire the shared effect.
- Off and reduced motion suppress hover/focus/activation feedback.
- The six native listeners on the plain owner return to zero when its icon unmounts.

All four final screenshots were inspected. Text and controls remain readable at both widths/themes without clipped fixture content; the screenshots capture settled state, while timed DOM/property and actual SVG bounds assertions prove motion. System-level tab hiding and offscreen cancellation are implemented but were not separately asserted by this bounded fixture.

Results and screenshots:

- Chromium results (`output/playwright/icon-feedback/results.json`, local artifact), 360 dark (`output/playwright/icon-feedback/feedback-360-dark.png`, local artifact), 1440 light (`output/playwright/icon-feedback/feedback-1440-light.png`, local artifact).
- WebKit results (`output/playwright/icon-feedback-webkit/results.json`, local artifact), 360 dark (`output/playwright/icon-feedback-webkit/feedback-360-dark.png`, local artifact), 1440 light (`output/playwright/icon-feedback-webkit/feedback-1440-light.png`, local artifact).

`tsc --noEmit` and scoped ESLint passed after the feedback corrections. The four glyph additions passed the focused SSR tests; root’s final integration adds the return-arrow glyph and passes all 33 tests, including SVG server rendering of all 136 names. No build or registry generation was run in this stream.

## Reproduce

From the repository root with the docs server running:

```sh
rtk proxy node scripts/check-icon-feedback.mjs
rtk proxy env ENGINE=webkit OUTPUT_DIR=output/playwright/icon-feedback-webkit node scripts/check-icon-feedback.mjs
rtk proxy node --import tsx --test tests/item-adornment.test.ts
rtk proxy npx tsc --noEmit
rtk proxy npx eslint registry/cojeev/ui/icon.tsx registry/cojeev/ui/animated-icon.tsx
```

`BASE_URL` can override the default `http://127.0.0.1:4320/cojeev-ui`; `OUTPUT_DIR` changes the browser artifact folder. The fixture performs local interactions only.

Root integration also migrated AgentChat’s remaining general glyphs to the shared Icon component, preserving their sizes and filled stop mark. The pack includes `arrow-up`, `paperclip`, `square`, `shield-check` and `corner-down-left` for that composition; its final count is 136.
