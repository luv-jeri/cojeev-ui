# Landing page smooth scroll design

## Goal

Add a balanced, natural smooth-scroll feel to the Cojeev UI marketing landing page with Lenis 1.3.26. Keep documentation pages on native scrolling and preserve the current landing-page composition, anchor links, reveal effects, keyboard behavior, mobile behavior, and reduced-motion support.

## Chosen approach

Use one landing-only client wrapper that owns a Lenis instance for the lifetime of the landing page. The wrapper will render the existing page unchanged, initialize Lenis after mount, and destroy it during unmount. This keeps the dependency and behavior out of documentation routes.

Lenis will use its own animation frame loop and a balanced interpolation value close to its documented default. Wheel and trackpad input will be smoothed. Touch scrolling will remain native by leaving `syncTouch` disabled. Anchor handling will be enabled so the hero link to `#playground` and the skip link to `#story-main` continue to work. `stopInertiaOnNavigate` will prevent leftover momentum when a visitor follows an internal link.

The integration will retain Lenis's default `respectReducedMotion` behavior. When the operating system requests reduced motion, scrolling will track input directly and anchor navigation will be immediate. No custom override will weaken that behavior.

## Boundaries

- Activate Lenis only while the root landing page is mounted.
- Do not initialize it in the site layout, documentation pages, workspace, or component specimens.
- Do not enable synchronized touch inertia because it can be unstable on older iOS versions and native touch already feels appropriate.
- Do not add scroll snapping, GSAP, a second animation scheduler, or site-wide scroll state.
- Import the recommended Lenis stylesheet once through the application stylesheet boundary; its selectors only affect a live Lenis instance.
- Preserve native nested scrolling. If a landing-page control later adds its own scroll container, it can opt out with Lenis's documented `data-lenis-prevent` attribute.

## Integration

Create a focused `LandingSmoothScroll` client component under `components/landing`. It will receive children, instantiate Lenis with `autoRaf`, anchors, reduced-motion support, and balanced wheel smoothing, then clean up the instance. `LandingPage` will wrap its current content with this component.

The existing `FloatLayer`, WebGL scenes, intersection observers, and native scroll listeners will continue reading the browser's real scroll position. Lenis uses native scrolling, so they do not need a custom bridge.

## Failure behavior

The page remains usable before hydration. If JavaScript is unavailable, scrolling and anchors use native browser behavior. If Lenis initialization cannot run, the wrapper still renders every child. Unmount cleanup prevents listeners or animation frames from surviving route navigation.

## Verification

Add a focused Playwright check that proves:

1. a wheel gesture advances the landing page smoothly over multiple animation frames and settles near the intended position;
2. the `#playground` link reaches the correct section and updates the URL fragment;
3. reduced-motion mode makes programmatic anchor movement immediate;
4. an iPhone-sized touch context can scroll and operate landing controls without runtime errors;
5. navigating to documentation removes the Lenis instance and leaves docs scrolling native.

Run lint, TypeScript, unit tests, the production build, the focused check, and the existing marketing gate before pushing.
