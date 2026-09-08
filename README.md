# SahaJiv UI

A family of React components with a warm canvas, expressive shapes and considered motion. Copy the pieces you need through the shadcn registry, then make the source your own. MIT licensed, with no dependency on the private SahaJiv application.

**Review status:** release builds and publication are paused for owner review. The public documentation and registry can show an earlier release; the latest review work runs locally.

[Documentation](https://luv-jeri.github.io/sahajiv-ui/) · [Getting started](https://luv-jeri.github.io/sahajiv-ui/docs/) · [Registry](https://luv-jeri.github.io/sahajiv-ui/r/registry.json)

## Install in your project

Use a React 19 + TypeScript project configured with Tailwind CSS v4 and shadcn. Then install a component by URL:

```sh
npx shadcn@latest add https://luv-jeri.github.io/sahajiv-ui/r/button.json
```

The last source snapshot contains 90 UI entries, including six chart types, agent chat, animated icons, a theme toggle and reusable presence controls. Default menu adornments, gently organic selectors and a slower, varied theme reveal share the same design language. It includes component source, dependency primitives, exact styles, shared Motion utilities and licensed fonts. The optional `shape-scene` entry adds Three.js; ordinary components do not require it.

```tsx
import { Button } from "@/components/ui/button";

export function ContinueAction() {
  return <Button onClick={() => console.log("Continue")}>Continue</Button>;
}
```

Set `data-mode="light"` or `data-mode="dark"` on the document element. Open Motion settings beside any documentation example to try nine selection characters and copy their settings. Glide is calm by default; reduced motion and global Off keep content readable and still. Deeper body authoring is available in `adjuster`.

## Current local review

The local catalogue now has **100 UI entries**: the original 66 base components and 34 additions. These review changes are not yet published to the public registry.

- Six palettes—Paper, Tide, Grove, Clay, Orchid and Graphite—with a persistent contrast adjuster. Text, panel and control-edge roles change together in light and dark mode.
- Checkbox, radio and questionnaire selector sizes, configurable selected marks, and a markless outer-blob option.
- Independent list icon/background visibility, custom list scrollbars, and refined shared motion behaviour.
- Organic, line, segmented and orbit progress; organic, line and segmented sliders.
- Reusable profile card, work side panel, action dock, conversation panel and compact dashboard compositions. Persistent organisms move and transform into their real component parts.
- A living landing page, a scroll-following organism, and clay, glazed, speckled and flowing-contour shader sculptures.

All visible documentation controls use SahaJiv primitives. Composite components reuse the same base components. The creator page currently links to [Sanjay’s GitHub profile](https://github.com/luv-jeri).

## Develop the library

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev -- --hostname 0.0.0.0 --port 4320
```

Open [the live documentation](http://localhost:4320/sahajiv-ui/). To view it on a phone on the same Wi-Fi, replace `localhost` with the Mac's Wi-Fi IP. Keep the Mac awake. Set `SAHAJIV_DEV_ORIGINS` to that IP to permit development updates from that origin.

```sh
npm run typecheck
npm run lint
npm test
```

After owner approval, `npm run build` generates the installable registry and static documentation in `out/`. `gate` serves that build and checks every catalog page at three widths in both themes, meaningful pointer/keyboard interactions, exact code copying, and all nine motion presets. CI runs these checks before GitHub Pages publication. `npm start` previews the static build at [localhost:3000](http://localhost:3000/sahajiv-ui/).

## Design and verification

The original 66 components remain the base. Additional components and intentional motion refinements are tracked in [REFINEMENTS.md](REFINEMENTS.md). [REFINEMENT-REPORT.md](REFINEMENT-REPORT.md) records the latest landing-page and control refinement. [OVERHAUL-REPORT.md](OVERHAUL-REPORT.md) records the 0.2.0 implementation and verification; [RELEASE-REPORT.md](RELEASE-REPORT.md) preserves the earlier 0.1.0 release evidence.

The supplied design system remains versioned under `reference/sahajiv-handoff-v4`. Production code never imports its CSS or JavaScript. The historical source comparison can be run with `npm run gate:reference`; its differences are retained separately from the refined production behavior. New work should preserve the shared typography, spacing, shape language, accessible colour roles and motion semantics.

Documentation uses [Fumadocs](https://github.com/fuma-nama/fumadocs) with SahaJiv's own visible components. Registry tooling uses [shadcn](https://github.com/shadcn-ui/ui). Fonts retain their bundled SIL Open Font Licences; see [FONT-NOTICES.md](FONT-NOTICES.md). Library code is covered by [MIT](LICENCE).
