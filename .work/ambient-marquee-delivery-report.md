# Backgrounds and Creative delivery

Built on integration checkpoint `5b9b3ab`. Production ownership is limited to the two new UI files, their same-name CSS files, and `components/examples/backgrounds.tsx`. No dependency, shared motion, registry builder, catalog, guide, or renderer changes.

## Design and implementation

AmbientBackground extends the authored warm flat ground and four category accents. Three large, cropped silhouettes form the drift/orbit compositions; contour uses sparse colored ellipses. Foreground children receive an opaque canvas surface. No gradients, blur, shadows, confetti, random values, or new palette colors. `paused` controls decoration only. Native div props, optional children, stable SSR markup.

Marquee owns one semantic list plus an imperatively mirrored inert/aria-hidden list. The copy strips IDs, form names/references, and tab stops and does not mount duplicate React effects. Text/child changes refresh it. Hover and focus pause travel; focusing original content exposes a static wrapping list so keyboard users can reach every item. Global Off and reduced motion remove travel and hide the copy. Static direct children have a maximum width matching the list, so even the fixture's 650px text block wraps on mobile. The visible Button supports local or controlled pause state. Direction and speed are typed settings, not visual variant props.

Both components use CSS keyframes with IntersectionObserver and document visibility state, and contain no requestAnimationFrame loop or timer. Off/reduced removes their animations; inactive contexts pause existing CSS timelines. Observers and visibility subscriptions are released on cleanup. The decorative background never changes foreground accessibility semantics.

## Focused evidence

- Focused transitive TypeScript and owned TSX ESLint: PASS.
- Impeccable mechanical detector: no findings.
- SSR renderToString stability: identical output twice, paused initial composition, one semantic link, inert copy shell.
- Final browser receipt: **52/52 checks PASS**, zero runtime errors, Chromium at 390px mobile/touch and 1440px desktop, light and dark.
- Covered all three ambient variant controls, normal timeline advance, explicit background and marquee pause/resume, actual mobile tap and coarse pointer, desktop hover, direction/speed changes, inert copies and unique IDs, original-only keyboard tab order, focus static layout, runtime global Off and reduced media changes, mobile long-child bounds, offscreen pause with a frozen CSS clock, visibilitychange handler, and unmount animation cleanup.
- Four captured layouts were visually inspected: `artifacts/ambient-marquee/{390,1440}-{light,dark}.png`. The harness uses an isolated browser/server on 4350; both are closed.

Limits: visibilitychange was dispatched with an explicit visibilityState override, so this proves the event handler rather than physical OS tab backgrounding. OS reduced motion used Chromium media emulation. No physical Safari/device or broad source-fidelity matrix is claimed.

## Initial failures preserved

`.work/ambient-marquee-verification-initial.json` preserves the first incomplete pass. It exposed a real native-touch failure: focus expanded the status text and moved the pause button before touchend, sending the trusted click to the header. Reserving stable status width and height fixed that, confirmed by real taps in both mobile themes.

The first clock assertion sampled a paused CSSAnimation before its pending pause operation settled; the final harness awaits `Animation.ready` before checking that time is frozen. One immediate global Subtle + media-change sequence also left two example-wrapped data-motion flags stale while four standalone roots updated. Later direct media traces updated all six roots, and the final protocol verifies the rendered global mode before changing OS preference. No shared-hook fix is claimed and that initial rapid-transition observation remains preserved; all settled transitions pass. No final product defect was reproduced within the bounded checks.

## Integration metadata

No explicit size prop is implemented on either component. Marquee's default is one visual treatment, with separate direction and speed props. Its `focused` metadata state corresponds to `data-content-focused=true` and the static original-list layout.

```json
{
  "ambient-background": {
    "category": "Backgrounds",
    "variants": [
      "drift",
      "orbit",
      "contour"
    ],
    "sizes": [],
    "states": [
      "running",
      "paused",
      "static"
    ],
    "exports": [
      "AmbientBackground",
      "ambientBackgroundVariants"
    ],
    "typeExports": [
      "AmbientBackgroundProps"
    ],
    "example": "AmbientBackgroundExample",
    "props": {
      "variant": "drift | orbit | contour; default drift",
      "paused": "boolean; default false",
      "children": "ReactNode; optional"
    }
  },
  "marquee": {
    "category": "Creative",
    "variants": [
      "default"
    ],
    "sizes": [],
    "states": [
      "running",
      "paused",
      "static",
      "focused"
    ],
    "exports": [
      "Marquee"
    ],
    "typeExports": [
      "MarqueeProps",
      "MarqueeDirection",
      "MarqueeSpeed"
    ],
    "example": "MarqueeExample",
    "props": {
      "direction": "left | right; default left",
      "speed": "slow | normal | fast; default slow",
      "label": "string; default Highlights",
      "paused": "boolean; optional controlled",
      "defaultPaused": "boolean; default false",
      "onPausedChange": "(paused: boolean) => void"
    }
  }
}
```

## Suggested guide JSON

```json
{
  "ambient-background": {
    "description": "Adds a quiet animated composition around content, with decorative shapes kept behind a readable surface.",
    "category": "Backgrounds",
    "usage": [
      "Choose drift, orbit, or contour for a welcome section, introduction, or decorative pause between sections.",
      "Pass children for foreground content and control paused when the surrounding experience should stop the decoration."
    ],
    "accessibility": [
      "Decoration is hidden and inert; foreground children keep their own semantics.",
      "Global motion Off and reduced-motion preferences produce a static composition; offscreen or hidden content pauses its animation."
    ],
    "related": [
      "shape",
      "card",
      "adjuster"
    ]
  },
  "marquee": {
    "description": "Moves a repeating content list with an explicit pause control and a static reading layout when motion is reduced.",
    "category": "Creative",
    "usage": [
      "Pass a short collection of responsive content items, then choose left or right direction and slow, normal, or fast speed.",
      "Use the built-in pause control or paused and onPausedChange to coordinate playback with application state."
    ],
    "accessibility": [
      "Only the original list is accessible; the visual copy is inert, hidden, and removed from keyboard navigation.",
      "Hover and focus pause motion, focused content becomes a static list, and Off or reduced motion wraps all original items for reading."
    ],
    "related": [
      "carousel",
      "scroll-area",
      "adjuster"
    ]
  }
}
```

Consumer imports are conventional sibling imports. AmbientBackground depends on Shape, class-variance-authority, utils, settings, and useReducedMotion; Marquee depends on Button, Typography, utils, settings, and useReducedMotion. Both use React only for component state and observers. No new npm dependency is needed. Add the same-name CSS files through the existing production style integration; the example exports are self-contained and require no props.
