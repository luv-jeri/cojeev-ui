# Installation

Cojeev UI is distributed through a public shadcn registry.

Cojeev UI copies React source into your application through the shadcn CLI. Use a React 19 application with TypeScript, Tailwind CSS v4, and an `@/` import alias. The registry includes its token theme and fonts; it does not require the private Cojeev application.

For the checked compiler baseline, declaration boundary and the separate route
for stricter TypeScript flags, see [Strict TypeScript integration](strict-typescript-integration.md).
For the default embedded font delivery and the optional verified file-backed
conversion, see [Optional local font files](local-fonts.md).
If an install does not behave as this page describes, start with
[Install troubleshooting](install-troubleshooting.md).

## Install in a fresh project

`npx shadcn@latest init` scaffolds the project and the shadcn conventions this
registry expects. Choose the framework when prompted; the commands below are the
same for Next.js and Vite.

```sh
npx shadcn@latest init
npx shadcn@latest add https://000h.cojeev.com/r/button.json
```

**Next.js only, until B-028 is fixed:** the registry's `css` block writes
`@import "@/styles/…"` into `app/globals.css`, and Tailwind v4's PostCSS resolver in Next does not read
tsconfig `paths`, so the install will not compile until those five imports are rewritten to relative
paths. Vite is unaffected. See
[Install troubleshooting](install-troubleshooting.md#tailwind-reports-an-unknown-utility-or-nothing-is-styled).

```tsx
import { Button } from "@/components/ui/button";

export function Example() {
  return <Button variant="accent">Continue</Button>;
}
```

The install needs network access to `000h.cojeev.com` and to your package
registry. It writes source only: there is no runtime dependency on the Cojeev
website, and installed components contain no analytics.

## Two ways to name the same registry

Both forms install identical source. The URL form needs no setup and is what the
copy buttons on this site produce; the namespace form is shorter once configured.

| Form | Command | Setup |
| --- | --- | --- |
| URL | `npx shadcn@latest add https://000h.cojeev.com/r/button.json` | none |
| Namespace | `npx shadcn@latest add @cojeev/button` | `components.json` entry below |

```json
{
  "registries": {
    "@cojeev": "https://000h.cojeev.com/r/{name}.json"
  }
}
```

Keep your existing `components.json` fields when you add `registries`. The
namespace is a local alias for the URL: **the registry's own name is `cojeev`,
and its homepage is `https://000h.cojeev.com`.** The shadcn directory lists the
project as `@000h-cojeev`; that is the directory's own label for the listing, not
a namespace defined by this registry, and it is not a value to copy into
`components.json`.

## Light and dark

The foundation stylesheet carries both modes as `data-mode` token values. Set the
mode on the document element, once, before or after hydration:

```ts
document.documentElement.dataset.mode = "dark"; // or "light"
```

An unset `data-mode` renders the light palette. To follow the operating system
and stay in step with later changes, write the attribute from a media query
listener rather than reading the preference once at mount.

The library's own mode is independent of a class-based `dark` variant of your
own. A shadcn starter theme's `dark` class keeps working for your other
components, and Cojeev components read `data-mode`, so the two do not fight.
The foundation also merges its semantic colors after an initialized shadcn
starter theme, so direct component installs use the same canvas and text colors
as these docs.

## Fonts

Body and display typography use the bundled fonts, installed inline in the
foundation stylesheet. For explicit Tailwind font utilities, use
`font-cojeev-text` and `font-cojeev-display`; an existing app's `font-sans`
remains its own choice. See [Optional local font files](local-fonts.md) to move
the same bytes into sibling `.woff2` files.

## Icon geometry and deep imports

The generated Lucide geometry (`lib/cojeev/lucide-icon-data.ts` and
`lib/cojeev/icon-data.ts`) ships as its own optional item,
`cojeev-icon-geometry`, so an install that renders no icon does not pay for it.
Every entry that reaches the icon — `icon`, `animated-icon`, and the 58 other
entries that render an icon internally — declares that item, so installing any of
them installs the geometry automatically. `@/components/ui/icon` needs no second
command and no extra setup.

What changes is the **deep import**. After any fresh install whose entries do not
reach the icon — `button` and `text-reveal` included, not only the foundation on
its own — `@/lib/cojeev/lucide-icon-data` and `@/lib/cojeev/icon-data` are not
present. If you import those modules directly, install the geometry item once:

```sh
npx shadcn@latest add https://000h.cojeev.com/r/cojeev-icon-geometry.json
```

With the namespace configured (see [Two ways to name the same
registry](#two-ways-to-name-the-same-registry)) the equivalent shorthand is
`npx shadcn@latest add @cojeev/cojeev-icon-geometry`.

The item writes the same two target paths every earlier release used
(`lib/cojeev/icon-data.ts`, `lib/cojeev/lucide-icon-data.ts`), so no import
specifier changes and no component edit is needed. Verified end to end: an
icon-free `button` install does not contain either file, and the command above
restores both, after which a deep-importing app typechecks, builds and reads
`getLucideIcon("wind")`.

> The item ships with the release that carries the split. Until that release is
> deployed, the live endpoint returns 404, exactly as it does for any item that
> exists only in the candidate payloads; local verification uses
> `COJEEV_REGISTRY_URL` as described under [Reproduce the stranger
> installation](#reproduce-the-stranger-installation).


You can then use `npx shadcn@latest add @cojeev/button`. The namespace entry is an explicit consumer configuration step; installing a component URL does not automatically add it.

## Upgrade an earlier installation

Components read spacing, type and control-height tokens that the foundation stylesheet defines. The shadcn CLI never replaces a file you already have unless you ask, so a project installed before a token was added keeps its old `tokens.css`, and a newly added component can lose its spacing or font. Refresh the foundation when you add components from a newer release:

```sh
npx shadcn@latest add https://000h.cojeev.com/r/cojeev.json --overwrite
```

This replaces every file the foundation installs: its stylesheets, `lib/utils.ts` (the `cn` helper), `lib/cojeev/`, `lib/cojeev-motion/` and the font script. Preview the changes with `--dry-run` first, then reapply any local edits you made to those files.

## Reproduce the stranger installation

This command creates a new directory in the operating system's temporary folder, installs Vite and React, runs the real shadcn CLI, installs five registry components, and builds that app. It prints the directory and writes a timestamped receipt under `artifacts/stranger/`.

```sh
node scripts/verify-install.mjs
```

To test selected components against a locally served registry:

```sh
COJEEV_REGISTRY_URL=http://127.0.0.1:4318 npm run registry:build
python3 -m http.server 4318 --bind 127.0.0.1 --directory public
# In another terminal:
node scripts/verify-install.mjs --url=http://127.0.0.1:4318 --components=button,badge,card
```

The verification app is separate from this repository. It receives component files only through the registry installation command. Screenshot and keyboard/pointer verification are recorded separately from a successful build.

To verify the foundation alone in another fresh app, run:

```sh
node scripts/verify-install.mjs --components=cojeev
```

This renders only the base typography and canvas. Its separate timestamped receipt is written under `artifacts/stranger/`.

## Audit the complete catalog

```sh
node scripts/audit-registry-consumer.mjs
```

This creates an isolated registry copy and a fresh consumer outside the repository. It installs the UI entries in the registry snapshot, checks import and dependency closure, compares installed styles, typechecks and builds, and runs selected rendered interactions. It writes a receipt and screenshots in the printed temporary directory.

To retest a successfully installed consumer after changing library source, use `node scripts/audit-registry-consumer.mjs <existing-audit-directory> --resume --refresh`. This preserves the original receipt, regenerates the registry snapshot and updates the consumer through the real shadcn CLI. `--resume` alone reruns build/runtime checks against the original installed snapshot.

## Conditional content and motion

Install `presence` when your application adds or removes components conditionally. Keep `MotionPresence` mounted outside the conditional; `asChild` preserves the native component and its semantics:

```tsx
import { MotionPresence, MotionSurface } from "@/components/ui/presence";
import { Card, CardTitle } from "@/components/ui/card";

<MotionPresence>
  {visible && (
    <MotionSurface key="result" asChild preset="rise">
      <Card><CardTitle>Your result is ready</CardTitle></Card>
    </MotionSurface>
  )}
</MotionPresence>
```

The library retains its own dynamic panels and rows. Caller-owned conditionals need the boundary above. Exiting interactive content becomes inert and hidden from accessibility APIs. Global Off and system reduced motion settle immediately. Command and Combobox preserve cmdk's immediate semantic filtering and animate their results surface; filtered options are not kept as live keyboard targets during an exit.
