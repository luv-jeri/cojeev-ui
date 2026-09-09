# UI Layouts reference audit and implementation

Six references audited against current source; five new registry entries and one consolidated mapping. The machine record is `verification/reference-layouts.json`. No existing component, dependency, shared metadata, global CSS or root script was edited.

## Sources and duplicate decisions

Live official documentation was inspected with the web tool on 2026-09-09. Actual reference TypeScript source was then downloaded from the official [ui-layouts/uilayouts repository](https://github.com/ui-layouts/uilayouts) and inspected under `/tmp/cojeev-reference-sources/uilayout-*.tsx`. These original adaptations do not copy upstream implementation source or SVG artwork.

| Reference | Decision | Existing-code evidence and resulting behavior | Category |
| --- | --- | --- | --- |
| [Motion Drawer](https://www.ui-layouts.com/components/motion-drawer) | New composition | `Sheet` already supplies modal focus management and directional entrance. `Drawer` is a bottom surface and `Sidebar` collapses a rail. None exposes a drag-dismiss handle. `MotionDrawer` composes Sheet, adds handle-only physical-edge dragging, logical start/end support and short trigger travel. | Layout |
| [Linear Modal](https://www.ui-layouts.com/components/linear-modal) | New composition | Existing Dialog, Preview and Presence lack shared-layout card/image/title continuity. `LinearModal` uses existing Dialog parts and Radix modal primitives with Motion layout IDs for a caller media card that expands into a detail dialog. | Layout |
| [Image Masking](https://www.ui-layouts.com/components/image-masking) | New | Existing Shape is decorative (`aria-hidden`) and ShapeScene is a 3D sculpture. `ImageMasking` accepts a semantic caller image, alt text, caption and existing signature silhouette, rendered through CSS mask-image or an SVG clip path. | Creative |
| [Clip Path](https://www.ui-layouts.com/components/clip-path) | Consolidated | Same media-framing mechanism as Image Masking. Metadata maps this to `image-masking` with `method="clip"`; no duplicate component or thin alias was created. | Creative |
| [Buy Me Coffee](https://www.ui-layouts.com/components/buy-me-coffee) | New | Existing HeroButton animates an arrow; the reference is a typographic poster that reveals an enlarged cup. `BuyMeCoffee` adapts that interaction with an original cup drawing and plain support copy, a required caller destination and hover/focus parity. | Actions |
| [Swapy](https://www.ui-layouts.com/components/swapy) | New | No generic reorder/swap layout exists in the library; data-table references to caller row ordering are not a drag feature. `Swapy` uses React-owned order with pointer-handle swapping, keyboard arrow/Home/End swapping, visible earlier/later buttons and announcements. | Layout |

Categories match `lib/categories.ts` exactly; Drawer/Sheet/Dialog family remains together in Layout.

## Concrete behavior and limits

- Motion Drawer uses existing Sheet for Escape, outside dismissal, focus trapping, scroll locking and focus return. Its gesture is limited to the explicit handle, leaving content and page scrolling native. A short or wrong-direction drag returns to the resting position; it does not trigger the handle click after dragging. No persistent desktop navigation rail or upstream push/merge/stay option matrix is claimed.
- Linear Modal has native button activation, labeled dialog content and a close action. Both compact and card presentations use one caller title, image, description and detail content. The shared-layout animation is an adaptation; no pixel-exact comparison with the upstream implementation is claimed.
- Image Masking consolidates CSS masks and normalized SVG clip paths with unique per-instance IDs. It uses Cojeev signature silhouettes; animal silhouettes, video masking and fixed-background parallax from the upstream collection are outside this image component.
- Buy Me Coffee is a native navigation link with a real caller-supplied `href`. The example links to a visible local support-information section. It has no payment processing, fabricated checkout or payment success state. Invalid or executable destinations yield a clear unavailable state without a link.
- Swapy persists ordering in internal React state by default and supports controlled `order` plus `onOrderChange` for caller persistence. New/removed items reconcile without losing the relative order of retained items. State is not silently written to storage. Item IDs should be unique. It swaps two slots on drop rather than reproducing every upstream Swapy layout/auto-scroll mode. No new package was added.
- Shared motion settings, reduced motion and viewport/document visibility disable optional motion. Native content/selection/navigation remain usable in stillness. No global pointer listeners or touch interception outside handles were added.

Examples are explicit named exports in `components/examples/reference-layouts.tsx`. Images are original local SVG data URLs and existing ShapeArtwork instances. Root owns registry/source extraction, production build and browser checks.

## Verification

- `node --import tsx --test tests/reference-layouts.test.ts`: 9 tests passed. Includes immutable identity-preserving swaps, caller-item reconciliation, physical drawer threshold, safe support destinations, both semantic image methods, unique SVG clip IDs, support-link states, actual ordered card markup/keyboard alternatives, empty states and native dialog triggers.
- New helper tests were written before the helper implementation; initial execution failed on the absent new module. SSR semantic checks were added after component implementation and are not represented as test-first render coverage.
- Scoped ESLint for new UI, helper, examples and tests: passed with zero warnings.
- `npx tsc --noEmit`: passed across the current checkout.
- Full `npm run lint` was attempted after removing the CSS gate violations. It currently stops on unrelated `components/reporting/capture-controls.tsx` image warning and `registry/cojeev/lib/reference-ref.ts` forwarded-ref mutation error; both were sent to root. The new layout files have no reported lint errors.
- Runtime gestures, browser focus return, shared-layout appearance and multi-width screenshots still require the root browser pass. Unit/SSR evidence does not substitute for those checks.

## Landing use

Use Motion Drawer for a small navigation surface, Linear Modal for an optional component story, and one Image Masking silhouette beside the narrative. Keep Buy Me Coffee in the footer only when real support information or a destination exists. Swapy is an optional interactive playground, not essential landing content. Clip Path is the same image family, so it does not need another competing section.


## Independent Swapy browser diagnosis — 2026-09-09

Root's combined gate reported unchanged order after its drag step. Direct Playwright event tracing separated the paths: keyboard ArrowRight committed the correct order, while clicking the bottom Restore control scrolled the handles out of view. The next mouse pointerdown targeted HTML at y=-582 rather than the handle. This was a harness-coordinate failure, so no Swapy implementation change was made.

Added `tests/reference-layouts-swapy.browser.mjs`, which waits for the hydrated page, independently checks keyboard reordering, restores order, scrolls the stage into view, remeasures both endpoints, asserts a real handle hit and tests mouse/touch swapping.

- Desktop 1440×1050: keyboard passed; mouse passed. After Reset the handle top was -604.11; after scrolling, pointer start y=176.89 and target y=400.80.
- Touch 390×1050: keyboard passed; CDP touch passed. After Reset the handle top was -1351.86; after scrolling, pointer start y=196.14 and target y=837.14.
- Both ended with `[connect, collect, continue, grow]`, the expected position announcement and no page errors.
- Event tracing showed gotpointercapture, pointermove over Connect, pointerup, then lostpointercapture; capture was functioning.
- Results: `/tmp/cojeev-swapy-regression.json`. Command: `node tests/reference-layouts-swapy.browser.mjs`.

Root was notified to correct viewport placement before pointer coordinates in the shared gate. This finding does not claim browser validation of the other layout components.
