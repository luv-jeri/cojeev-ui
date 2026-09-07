# Fresh public source validation — PASS

Cloned `https://github.com/luv-jeri/sahajiv-ui.git`, branch `main`, from the real public remote into a newly created external temporary directory. No source files were edited and no browser gate was run.

- Remote commit: `47e30c08dd2083612aedf7347f9504fe4183a427`.
- Git tree: `8bf123b06beeab238f3f7a391e1833936ffe22a3`.
- Node: `v22.22.0`; npm: `10.9.4`.
- Initial and final `git status --porcelain=v1`: empty (clean).
- Clone checkout: `/private/tmp/sahajiv-ui-fresh-source-c24f1n18/repo`. It is retained for inspection.
- UTC: 2026-09-07T22:37:39.121232+00:00 → 2026-09-07T22:38:25.267093+00:00 (46.146 seconds total).

| Actual command | Exit | Time |
|---|---:|---:|
| `rtk proxy git clone --branch main --single-branch https://github.com/luv-jeri/sahajiv-ui.git <new-temp-directory>/repo` | 0 | 8.359 s |
| `rtk proxy npm ci` | 0 | 19.555 s |
| `rtk proxy npm run build` | 0 | 17.784 s |

Install/build ran inside that fresh clone with the Node22 bin directory first on PATH. `npm ci` added 940 packages and reported zero audited vulnerabilities; non-fatal dependency deprecation notices remain in the raw log. `npm run build` regenerated the registry, compiled Next.js and its TypeScript check, and generated **82/82 static pages**.

The generated registry contains **78 items / 77 registry:ui entries**. The generated `public/r/registry.json` and built `out/r/registry.json` have identical SHA-256 hashes. Scanned **159 text files** under `public/` and `out/r/` for user-home, volume, local-file URL and fresh temporary-checkout paths: **zero findings**. Git remains clean after regeneration/build, so this fresh public snapshot requires no source adjustment to build.

## Fingerprints

- Tracked source files: 1274.
- Source fingerprint: `8d3c479c4ec4b4b8fe9ad2f11059bca35b64c0e879f017f4435bbe4b26ec2cee`.
- Fingerprint algorithm: SHA-256 over sorted relative path + NUL + per-file SHA-256 + LF.
- `package-lock.json`: `784d6ac8836d588aaf98ddac58adf89ca31913f84ecc04c15a2322e51396de71`.
- Generated and built registry: `4c0407f14271590148a00bc122b471fc61aa0e018e0c18c105e990f9ee8f5ffa`.

Raw machine receipt: `.work/fresh-public-clone-receipt.json`. Complete install/build output: `.work/fresh-public-clone-npm-ci.log`, `.work/fresh-public-clone-build.log`. Reproducer: `.work/verify-public-clone.py` (creates another new external directory only when deliberately run).

This proves a real fresh public clone, dependency installation, and production build at the named commit. CI status, deployed URLs, public registry consumer installation, and browser behavior are separate checks owned by root. Stopped after this passing bounded check.
