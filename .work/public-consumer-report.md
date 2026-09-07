# Public-registry consumer verification

Fresh external app: `/tmp/sahajiv-ui-stranger-qFCcg0`. The app was created from an empty directory with npm and real `shadcn@latest init`, then installed only from `https://luv-jeri.github.io/sahajiv-ui/r/`. No local registry source or generated registry JSON was copied into the app.

Requested specimens: Button, Badge, Card, Accordion, Dialog, CodeBlock, TextReveal, ShapeScene. The CLI resolved their actual public dependency closure. This is eight rendered public specimens, not a public all-77 consumer sweep.

Manifest: `https://luv-jeri.github.io/sahajiv-ui/registry.json` returned HTTP 200 JSON at `2026-09-07T22:47:35.459Z`, 78 entries (77 UI + foundation), SHA256 `4c0407f14271590148a00bc122b471fc61aa0e018e0c18c105e990f9ee8f5ffa`. Per-entry URLs and hashes are in the install receipt.

Install, TypeScript, and production Vite build passed. Runtime 282.952s, including 212.698s waiting for deployment (eight readiness attempts; early HTML responses preserved). Installed Node v22.22.0, npm 10.9.4, shadcn 4.21.0, React 19.2.8, Vite 7.3.6, Tailwind 4.3.3, TypeScript 5.9.3, Three 0.185.1 and @types/three 0.185.4. All resolved package versions are recorded.

## First browser result

The first production-build browser pass took 7.897s. All eight rendered; Button action, Accordion open, Dialog focus/Escape, exact CodeBlock clipboard content, accessible TextReveal content, and real ShapeScene WebGL (Chromium/SwiftShader) passed. The sculpture had 1,390 sampled shaded colors. All four 390/1440 light/dark document bounds matched their viewports. No page or console errors occurred.

The theme assertion failed and exposed a real installer conflict: fresh shadcn `src/index.css:265` retained later neutral `:root` semantic variables, overriding the imported SahaJiv `tokens.css:39–40` aliases. Changing `html[data-mode]` as documented updated SahaJiv `--v-*` colors but left body `--background/--foreground` and Card `--card-foreground` neutral. The dark screenshot shows a black Card title on a dark brown card. Body remained white in both modes. Existing `.dark` values also need consideration so the ordinary shadcn host and the documented SahaJiv data-mode behavior coexist reliably.

Root has exact source-line evidence and owns the foundation correction. The proposed delivery uses native CSS declaration merging because dependency-base cssVars deliberately preserve existing host values. The library uses named SahaJiv font bridges; host-owned `font-sans` is not required to change, and the original result did not establish a body/display font defect. The prepared focused closeout checks actual body/display fonts, loaded faces, semantic aliases, and Card contrast. No specimen-specific style workaround or production source edit has been made by this agent. First failed receipt, logs, and screenshots are preserved; passing interactions will not be repeated without a material reason.

## Files

- `.work/verify-public-consumer.mjs`: original verify-install workflow plus bounded public JSON readiness and manifest/version receipts.
- `.work/check-public-consumer.mjs`: focused built-app browser probe.
- `.work/public-consumer-install-receipt.json` and `.work/public-consumer-install.log`: real CLI/build evidence.
- `.work/public-consumer-browser-first-failure-receipt.json` and corresponding log: unmodified first browser failure.
- `.work/public-consumer-browser/`: original light/dark screenshots, actual 3D output, and failure screenshot.

## Deployment pause

The candidate public manifest is `8cdc014555da7eb2c07db8c6f91f51943d063f6d76f436a2c8ed184498aaf0b6`; candidate foundation is `7f7324e45bec802c4b18bbb1c09d74b3597dc2cce9ea87db49e166c7b5d7d3b6`. Read-only inspection confirms the qualified semantic bridge and the documented data-mode dark variant. The public update runner requires both exact hashes, then requests Button/Card URLs so the foundation is exercised as a dependency.

On 2026-09-07 at 23:15:52 UTC, the parent reported corrected Pages run `34168747473` failed its mobile gate and had not deployed. The exact public watcher was stopped at the parent's request. No update CLI ran; hashes of all 29 installed component/support modules were unchanged. Readiness attempts and the pause reason are preserved in `.work/public-consumer-update-paused-receipt.json`; the original app remains available for the next corrected deployment.

Status: install/build and interactions passed; final public theme integration remains unresolved pending corrected deployment. No deployment was performed by this agent.
