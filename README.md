![The 000h seed mark on warm paper, with organic shapes drifting right into a pale-blue stage that holds a profile card.](docs/readme/000h-readme-banner.svg)

<sub>Artwork, not a screenshot — the seed mark, the pigment stage and a profile card drawn in the library's own tokens. The components themselves move: **[open the live gallery](https://000h.cojeev.com/)**.</sub>

# 000h by Cojeev

Expressive React components with organic shapes, purposeful motion, and source you can make your own.

**172 installable components**, MIT licensed and shadcn-compatible, with no dependency on the private Cojeev application. You add one entry at a time and the source lands in your project, where it is yours to change.

[Website](https://000h.cojeev.com/) · [Browse components](https://000h.cojeev.com/docs/) · [Work with Sanjay](https://000h.cojeev.com/work-with-me/)

## Install one component

You need React 19, TypeScript, Tailwind CSS v4 and an initialized shadcn project with an `@/` alias.

```sh
npx shadcn@latest add https://000h.cojeev.com/r/button.json
```

```tsx
import { Button } from "@/components/ui/button";

export function ContinueAction() {
  return <Button variant="accent">Continue</Button>;
}
```

The added stylesheet carries both light and dark token values. Choose one with `document.documentElement.dataset.mode = "dark"`. [Installation details](INSTALLATION.md) cover the `@cojeev` registry configuration, theming and the fresh-install check.

## Four to start with

![Four component previews on warm paper under the heading "Find your next detail." — a pink card holding a rubber slider at 64, a blue card with a stack of panels and an Open drawer button, an olive card of coloured bento tiles labelled Home, Grow, Add and Keep, and a beige card showing a command palette listing Button, Card and Dialog.](docs/readme/000h-readme-gallery.png)

<sub>A still of the homepage gallery in this release, rendered from this repository's source. On the page itself each tile is the installed component, running.</sub>

| Component | How it feels |
| --- | --- |
| [`Slider`](https://000h.cojeev.com/docs/slider/) | The track answers the value. A rubber strand rests thick over a short span and stretches thin as you pull it wide. |
| [`MotionDrawer`](https://000h.cojeev.com/docs/motion-drawer/) | Drag it shut from any non-interactive area — buttons and links never start one. Stacked panels keep half-filled fields while they wait behind. |
| [`BentoGrid`](https://000h.cojeev.com/docs/bento-grid/) | Rounded cards, or one continuous puzzle whose tiles share seeded edges. Change the seed and the seams redraw while every tile and label stays put. |
| [`Command`](https://000h.cojeev.com/docs/command/) | Type to narrow, arrow through, press to run — or open the same list over the page as a palette. |

## Motion you can turn down

Motion here is a setting, not a decoration. Nine motion characters change how a control answers a press. `Motion Off` and the system's reduced-motion preference are designed to leave an interface complete and still rather than broken, and decorative backgrounds and WebGL sculptures are built to stop work offscreen and fall back to a static rendering. Each component's guide records what it does and where that stops — read the guide beside the component you install.

<details>
<summary><strong>Developing this repository</strong></summary>

Node.js 22.12 or newer, as declared in `engines`. Continuous integration pins 22.22.0.

```sh
npm ci
npm run dev -- --port 4320
```

```sh
npm run lint && npm run typecheck && npm test && npm run build
npm run check:examples   # every copyable example still compiles
npm run gate             # the built catalogue at three widths, both themes
```

Pull requests, and pushes to `main`, run lint, typecheck, the unit and worker test suites, then build a matched beta and production pair from the same commit, check each against its hosting content-security policy, run the browser gates, and verify a fresh consumer installation from each artifact. On `main`, beta deploys first and production promotes that same verified artifact after environment approval.

[CONTRIBUTING.md](CONTRIBUTING.md) describes what a new component needs.

</details>

## Licences

Library code is [MIT](LICENCE). The bundled DM Sans and Bricolage Grotesque keep their [SIL Open Font Licences](FONT-NOTICES.md), and the icon geometry files keep the Lucide and Feather notices inside them — preserve those when you copy the source. The supplied design system stays in `reference/cojeev-handoff-v4` for type, spacing, colour roles and shape language; production components import none of its CSS or JavaScript.

Documentation is built with [Fumadocs](https://github.com/fuma-nama/fumadocs); registry tooling is [shadcn](https://github.com/shadcn-ui/ui).

Built by Sanjay Kumar. [Work with me](https://000h.cojeev.com/work-with-me/) · [github.com/luv-jeri/cojeev-ui](https://github.com/luv-jeri/cojeev-ui)
