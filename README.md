# SahaJiv UI

**124 React components. Warm surfaces, expressive shapes and considered motion.**

An MIT-licensed component library for building thoughtful products. Install only the pieces you need through the shadcn registry; the source lives in your project and is yours to change. No dependency on the private SahaJiv application.

[Documentation](https://luv-jeri.github.io/sahajiv-ui/) · [Browse components](https://luv-jeri.github.io/sahajiv-ui/docs/) · [Registry](https://luv-jeri.github.io/sahajiv-ui/r/registry.json) · [Work with Sanjay](https://luv-jeri.github.io/sahajiv-ui/work-with-me/)

## Get started

Use React 19, TypeScript, Tailwind CSS v4 and an initialized shadcn project with an `@/` alias.

```sh
npx shadcn@latest add https://luv-jeri.github.io/sahajiv-ui/r/button.json
```

```tsx
import { Button } from "@/components/ui/button";

export function ContinueAction() {
  return <Button onClick={() => console.log("Continue")}>Continue</Button>;
}
```

Set `data-mode="light"` or `data-mode="dark"` on the document element. See [installation details](INSTALLATION.md) for registry namespaces, styling and consumer verification.

## What is inside

The catalogue contains **66 original base components and 58 additions**:

- Forms, selectors, menus, navigation, overlays, accessible scrolling and data display.
- Six palettes with persistent contrast controls, nine motion characters, organic progress and sliders, configurable selector shapes and sizes, and optional list adornments.
- Profile, invitation and focus cards; task, conversation and agent panels; a reusable action dock. Composite components use the same native library primitives.
- Area, bar, line, pie, radar and radial charts, with shared tooltip and keyboard interactions.
- Text Reveal, Word Relay, Text Ribbon, Animated Number, Number Input, Writing Caret, Living Link, Reading Trail, Activity Feed and Milestone Path.
- Ambient and depth backgrounds, pigment and contour fields, scroll layers, a measured marquee, reusable presence and illustrated pointer cues.
- Shape Artwork with SVG export; shared sculpture orbit controls; glyph, dither, ink, glass, fluid and particle sculptures. The material sculptures use bounded WebGL scenes with static fallbacks. Three.js is installed only with components that need it.
- Component previews with copyable example code, API details, dependency information and guides.

The landing page is built from this library: stationary foreground content, quiet background depth, scroll entrances, and real components assembling from small organic shapes. The shape workbench exports SVG or React code with the current shadow and outline settings.

Motion respects reduced-motion preferences, shared quiet settings and visibility. Decorative scenes stop work offscreen; real controls remain keyboard accessible. Individual guides explain each component's behaviour and limitations.

## This release's scope

After reviewing Skiper, Remocn, Canvas UI and React Bits, this expansion added **18 new entries** and improved existing components. Further cloning has stopped at the owner's request. The full 613-entry reference inventory remains a research record, not a claim that all of those components are implemented.

Original SahaJiv implementations draw on useful interaction ideas and retain the library's own visual language. Restricted source was not redistributed. [The expansion ledger](reference/expansion/coverage.json) records each reviewed concept and its differences; [the release report](RELEASE-0.2.0.md) records verification and publication status.

## Develop

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev -- --hostname 0.0.0.0 --port 4320
```

Open [localhost:4320/sahajiv-ui](http://localhost:4320/sahajiv-ui/). On a phone on the same Wi-Fi, replace `localhost` with the Mac's Wi-Fi IP. Set `SAHAJIV_DEV_ORIGINS` to that IP for development updates.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run check:examples
```

The build generates the installable registry and static documentation in `out/`. `npm run gate` checks the built catalogue at three widths in both themes; mobile and marketing gates cover additional WebKit and landing interactions. GitHub Actions runs verification before deploying GitHub Pages.

## Design and licences

The supplied design system is preserved under `reference/sahajiv-handoff-v4`. Production components do not import its CSS or JavaScript. Shared type, spacing, accessible colour roles, organic shapes and motion guide new work.

Documentation uses [Fumadocs](https://github.com/fuma-nama/fumadocs) with SahaJiv's visible components. Registry tooling uses [shadcn](https://github.com/shadcn-ui/ui). Library code uses [MIT](LICENCE); fonts retain their [SIL Open Font Licences](FONT-NOTICES.md), and attributed icon geometry retains its bundled notices.
