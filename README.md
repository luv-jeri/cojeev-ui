# SahaJiv UI

React components distributed as a shadcn registry, styled with Tailwind CSS v4 and the SahaJiv design tokens. Documentation uses Fumadocs.

**Under construction.** See [BUILD-STATUS.md](BUILD-STATUS.md) and [GATE.md](GATE.md) for measured coverage. The intended scope is 66 base components. This repository has no dependency on the private SahaJiv application.

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run build
npm start
```

Open [the local documentation](http://127.0.0.1:3000/sahajiv-ui/). Use `npm run dev` when editing the documentation.

Run the complete currently implemented fidelity gate:

```sh
npx playwright install chromium
npm run gate
```

The reference under `reference/sahajiv-handoff-v4` is the versioned fidelity oracle. Candidate code never loads its CSS or JavaScript. The gate checks repeated independent loads before comparing rendered styles and pixels. A failed or incomplete gate is reported explicitly.

Initial documentation and registry URL: `https://luv-jeri.github.io/sahajiv-ui/`.

Scaffold: [shadcn registry template](https://github.com/shadcn-ui/registry-template). Documentation framework: [Fumadocs](https://github.com/fuma-nama/fumadocs). Fonts retain their bundled SIL Open Font Licences. Library code is MIT licensed.
