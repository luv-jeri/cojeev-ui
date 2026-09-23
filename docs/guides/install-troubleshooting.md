# Install troubleshooting

Every entry below was reproduced against a real install of this repository's
candidate payloads — served on loopback and installed by the pinned
`shadcn@4.21.0` CLI into fresh Vite + React 19 + Tailwind v4 projects. The
published site at `https://000h.cojeev.com` was checked separately for
availability only: it serves the previous release until the current candidate is
deployed, so anything that depends on a new payload (the geometry recovery
command below, for example) is documented from the candidate and will 404 from
the live domain until that deploy. If a symptom is missing here, the
[installation guide](INSTALLATION.md) covers the intended path.

## Nothing happens when I run the install

**`shadcn: command not found`.** Use the runner rather than a bare binary:
`npx shadcn@latest add ...`. If `npx` itself cannot resolve the package, your
package registry is unreachable or a corporate proxy is blocking it; the install
needs both your package registry and `000h.cojeev.com`.

**The command exits without writing files.** The CLI treats an existing target
file as a conflict. Re-run with `--overwrite` when you mean to replace it, and
check that you are in the project root that holds `components.json`.

## `Cannot find module '@/lib/utils'` or `'@/lib/cojeev/...'`

The registry installs private helpers beside your `components/ui/` files, at
`lib/utils.ts` and `lib/cojeev*`, and the payload refers to them through your
`@/` alias. This resolves when:

- `components.json` has `aliases.utils` (conventionally `@/lib/utils`), and
- `tsconfig.json` maps `@/*` to a real directory, and
- the install ran after `shadcn init`, not before.

If you moved the alias after installing, re-run the `add` command so the
payloads are written for the current configuration.

If the missing module is specifically `@/lib/cojeev/lucide-icon-data` or
`@/lib/cojeev/icon-data`, the project is importing the optional icon geometry
directly but has no entry that reaches the icon. Since the geometry split, an
icon-free install — `button` on its own included — does not write those two
files. Install the item once and the imports resolve unchanged:

```sh
npx shadcn@latest add https://000h.cojeev.com/r/cojeev-icon-geometry.json
```

That command is verified end to end against the candidate payloads. The published
endpoint does not serve the geometry item yet — it 404s until the release that
contains it is deployed — so from the live domain today, install the item from a
build of this checkout (`npm run registry:build`) or wait for that deploy.

See [Icon geometry and deep imports](INSTALLATION.md#icon-geometry-and-deep-imports).

## Tailwind reports an unknown utility, or nothing is styled

The foundation stylesheet is plain CSS that declares Cojeev's `@theme`
variables, so Tailwind v4 must import it. In a Vite project the installed
`src/index.css` needs the import that `shadcn init` writes:

```css
@import "tailwindcss";
```

Then confirm the foundation arrived: `src/styles/cojeev/tokens.css` and
`src/styles/cojeev/theme.css` should exist. If they do not, the entry's
`registryDependencies` could not be fetched — re-run the same `add` command and
watch for a network error. A component installed without its foundation looks
unstyled rather than broken, which is the usual way this is noticed.

## Dark mode does not apply

Cojeev components read `data-mode` on the document element, not a `dark` class:

```ts
document.documentElement.dataset.mode = "dark";
```

An unset attribute renders the light palette. This is deliberately separate from
a class-based `dark` variant of your own, so both can coexist.

## Fonts look different from the documentation

The foundation embeds the two faces inline and needs no network request. If
typography looks like your system font instead, one of these is true:

- the foundation stylesheet is not imported (see above);
- your own `font-family` on `body` wins, because Cojeev sets body typography at
  the same specificity and yours loads later;
- you installed only a component and skipped the foundation, which the CLI does
  automatically unless the dependency fetch failed.

To use the explicit utilities, apply `font-cojeev-text` or `font-cojeev-display`.
Your existing `font-sans` is left alone on purpose.

## Motion is missing, or I want less of it

Animated entries declare the `motion` package themselves. If animation is absent
but the component renders, your package manager did not install it: re-run
`npm install` in the project.

To reduce motion globally, Cojeev honours the system preference and its own Off
state; reduced motion settles immediately rather than animating. Layout-only
entries such as `separator` do not install the animation runtime at all, so a
project that adds only static components stays small.

## An optional 3D entry does not render

`shape-scene`, `glass-sculpture`, `flow-sculpture`, `particle-sculpture`,
`glyph-sculpture`, `dither-sculpture` and `ink-sculpture` use Three.js. The
registry declares `three` (and `@types/three`) for those entries only, so the
install pulls them in. If the scene area is blank:

- confirm `three` is in `package.json` — those entries add it, no other entry
  does;
- check the browser console: a WebGL context failure renders a fallback, not a
  crash;
- server-side rendering the scene without a client boundary produces an empty
  canvas; render it on the client.

## The install warns about install scripts

Some transitive dependencies (`esbuild`, `sharp`) carry install scripts. A
strict package manager may hold them back. Approve them in the way your package
manager documents, then re-run the build. Cojeev itself ships no install script;
the fonts are already in the stylesheet.

## Reporting a problem

Include the entry you installed, the `shadcn` version, your framework and
Tailwind version, and the exact console or terminal output. The registry's own
source of truth is `https://000h.cojeev.com/r/{name}.json`, which you can fetch
to confirm what your install was given.
