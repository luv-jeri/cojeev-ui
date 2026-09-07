# Installation

The public registry is being built. Commands using the public URL become available after publication; see [BUILD-STATUS.md](BUILD-STATUS.md) for current coverage.

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

This command creates a new directory in the operating system's temporary folder, installs Vite and React, runs the real shadcn CLI, installs five registry components, and builds that app. It prints the directory and writes a receipt to `artifacts/stranger/install.json`.

```sh
node scripts/verify-install.mjs
```

For the three-component Phase 0 spike against a locally served registry:

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

This renders only the base typography and canvas. Its separate receipt is written to `artifacts/stranger/foundation.json`.
