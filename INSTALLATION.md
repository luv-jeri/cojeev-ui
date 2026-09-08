# Installation

SahaJiv UI is distributed through a public shadcn registry. See [RELEASE-REPORT.md](RELEASE-REPORT.md) for the verified release and its limits.

SahaJiv UI copies React source into your application through the shadcn CLI. Use a React 19 application with TypeScript, Tailwind CSS v4, and an `@/` import alias. The registry includes its token theme, fonts and shared motion code; it does not require the private SahaJiv application.

For a Vite project with Tailwind and the alias configured, initialize shadcn and add a component:

```sh
npx shadcn@latest init
npx shadcn@latest add https://luv-jeri.github.io/sahajiv-ui/r/button.json
```

```tsx
import { Button } from "@/components/ui/button";

export function Example() {
  return <Button variant="accent">Continue</Button>;
}
```

The added stylesheet includes both light and dark token values. Set the mode on the document:

```ts
document.documentElement.dataset.mode = "dark"; // or "light"
```

The foundation also merges its semantic colors after an initialized shadcn starter theme, so direct component installs use the same canvas and text colors as these docs. Body and display typography use the bundled fonts. For explicit Tailwind font utilities, use `font-sahajiv-text` and `font-sahajiv-display`; an existing app's `font-sans` remains its own choice.

For namespace commands, add this entry to your application's `components.json`:

```json
{
  "registries": {
    "@sahajiv": "https://luv-jeri.github.io/sahajiv-ui/r/{name}.json"
  }
}
```

You can then use `npx shadcn@latest add @sahajiv/button`. The namespace entry is an explicit consumer configuration step; installing a component URL does not automatically add it.

## Reproduce the stranger installation

This command creates a new directory in the operating system's temporary folder, installs Vite and React, runs the real shadcn CLI, installs five registry components, and builds that app. It prints the directory and writes a timestamped receipt under `artifacts/stranger/`.

```sh
node scripts/verify-install.mjs
```

To test selected components against a locally served registry:

```sh
SAHAJIV_REGISTRY_URL=http://127.0.0.1:4318 npm run registry:build
python3 -m http.server 4318 --bind 127.0.0.1 --directory public
# In another terminal:
node scripts/verify-install.mjs --url=http://127.0.0.1:4318 --components=button,badge,card
```

The verification app is separate from this repository. It receives component files only through the registry installation command. Screenshot and keyboard/pointer verification are recorded separately from a successful build.

To verify the foundation alone in another fresh app, run:

```sh
node scripts/verify-install.mjs --components=sahajiv
```

This renders only the base typography and canvas. Its separate timestamped receipt is written under `artifacts/stranger/`.

## Audit the complete catalog

```sh
node scripts/audit-registry-consumer.mjs
```

This creates an isolated registry copy and a fresh consumer outside the repository. It installs all 89 UI entries, checks import and dependency closure, compares installed styles, typechecks and builds, and runs selected rendered interactions. It writes a receipt and screenshots in the printed temporary directory. See [the overhaul report](OVERHAUL-REPORT.md) for the exact tested scope.

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
