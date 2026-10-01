# Migration baseline — partial inventory

Status: BLOCKED
Commits: schema fix 8100139; this partial record is committed separately. B1 step 15 is incomplete.
Stopped: readBaselineRecord rejects missing Content-Type on the three non-robots HTTP 404 apex probes (first: production.apexProbes./uikit?x=1.contentType).

This is a read-only snapshot captured on 2026-10-01 UTC. Steps 1–4 were already completed by the controller and were not repeated. Inventory commands ran from the detached C0 checkout at `/Users/sanjaykumar/Claude/Projects/cojeev-ui/.worktrees/b-c0`; records are in `chore/b1-baseline-record` at `/Users/sanjaykumar/Claude/Projects/cojeev-ui/.worktrees/t-b1`.

## Controller baseline

- R0: `36891631881`
- C0: `2337a6b608852149435306fe1111800e439e0d76`
- Beta manifest digest: `1759248c0800397e439192647e2e0bd20896390b81dfb61b613ec2f0e66d3114`
- Production manifest digest: `074e69ae08650c81e28b551fed7bce6c0a6e3a6b4c6e6c802de17ccfd5363ecc`
- `migration-baseline` prerelease: published, per controller; not changed here.

## OAuth session

`npx --no-install wrangler whoami >/dev/null` completed with exit 0. The refreshed session is stored at `~/.wrangler/config/default.toml` (modified 2026-10-01T18:12:48.580903Z), rather than the brief's `~/Library/Preferences/.wrangler/config/default.toml` (modified 2026-06-17T20:30:57.118624Z). The specified old file produced HTTP 403 for zone lookup and HTTP 401 for a Worker deployment. Repeating these reads with the refreshed session succeeded. No token was printed, logged, or written.

Cloudflare account: `25369d7051a3d996a1bca81f462a1fbc`.
Zone ID obtained from the refreshed session: `12e8b50b78c2c6af9e28406fede10d4e`.

## Needs owner token

- `zones/12e8b50b78c2c6af9e28406fede10d4e/rulesets/phases/http_request_dynamic_redirect/entrypoint`: not readable with wrangler OAuth (HTTP 403).
- `zones/12e8b50b78c2c6af9e28406fede10d4e/dns_records?per_page=100`: not readable with wrangler OAuth (HTTP 403).

These are unknown inventories, not evidence that rules or DNS records are absent. The controller explicitly permits recording HTTP 401/403 and continuing.

## Step 5 — Worker versions

All five active deployments have a single version receiving 100% of traffic. The split-traffic stop condition was not met.

```json
{
  "cojeev-ui-registry": {
    "created_on": "2026-10-01T17:31:58.057781Z",
    "versions": [
      {
        "version_id": "b81bb256-6ea2-4f9d-8f67-acacc50fd578",
        "percentage": 100
      }
    ]
  },
  "cojeev-ui-registry-beta": {
    "created_on": "2026-10-01T16:47:09.240811Z",
    "versions": [
      {
        "version_id": "3b49e03c-e780-4690-8d5a-2b2001de5048",
        "percentage": 100
      }
    ]
  },
  "cojeev-ui-reporting": {
    "created_on": "2026-10-01T17:31:35.519396Z",
    "versions": [
      {
        "version_id": "35566e65-80a8-4b6c-82f9-7363fc39f8c2",
        "percentage": 100
      }
    ]
  },
  "cojeev-ui-reporting-beta": {
    "created_on": "2026-10-01T16:46:54.774584Z",
    "versions": [
      {
        "version_id": "b69ecfaf-0390-4835-9a8a-46e0879687cc",
        "percentage": 100
      }
    ]
  },
  "cojeev-coming-soon": {
    "created_on": "2026-09-30T22:11:51.43467Z",
    "versions": [
      {
        "version_id": "8dc4539a-ec6e-4efe-ac64-6a0726b46c70",
        "percentage": 100
      }
    ]
  }
}
```

## Step 6 — Routes, custom domains, redirects and DNS

```json
{
  "routes": [
    {
      "pattern": "cojeev.com/*",
      "script": "cojeev-coming-soon"
    }
  ],
  "domains": [
    {
      "hostname": "beatass.com",
      "service": "beatass",
      "environment": "production"
    },
    {
      "hostname": "www.beatass.com",
      "service": "beatass",
      "environment": "production"
    },
    {
      "hostname": "updates.cojeev.com",
      "service": "cojeev-updates-redirect",
      "environment": "production"
    },
    {
      "hostname": "feedback-0db.cojeev.com",
      "service": "0db-reporting",
      "environment": "production"
    },
    {
      "hostname": "0db.cojeev.com",
      "service": "0db",
      "environment": "production"
    },
    {
      "hostname": "feedback-beta.cojeev.com",
      "service": "cojeev-ui-reporting-beta",
      "environment": "production"
    },
    {
      "hostname": "beta.000h.cojeev.com",
      "service": "cojeev-ui-registry-beta",
      "environment": "production"
    },
    {
      "hostname": "feedback.cojeev.com",
      "service": "cojeev-ui-reporting",
      "environment": "production"
    },
    {
      "hostname": "000h.cojeev.com",
      "service": "cojeev-ui-registry",
      "environment": "production"
    }
  ],
  "redirectRules": {
    "unreadable": "not readable with wrangler OAuth (HTTP 403)"
  },
  "dns": {
    "unreadable": "not readable with wrangler OAuth (HTTP 403)"
  }
}
```

`cojeev.com/*` belongs to `cojeev-coming-soon`. Readable routes contain no separate `cojeev.com/ui` route; readable custom domains contain no apex custom domain. Redirect rules could not be checked for an existing `/ui` match because the read returned HTTP 403.

## Step 7 — Turnstile widget inventory and reporting config

The widget projection contains only public sitekeys, names, and domains. Reporting bindings were confirmed against the public `/v1/config` endpoint in each environment. Production uses `Cojeev UI reporting`; beta uses `000h beta reporting`, with a distinct sitekey. No secret was read or compared.

```json
{
  "widgets": [
    {
      "sitekey": "0x4AAAAAADsdiC39hBablyR8",
      "name": "GameNightOwl bug form",
      "domains": [
        "gamenightowl.com",
        "gamenightowl.pages.dev",
        "localhost"
      ]
    },
    {
      "sitekey": "0x4AAAAAAEt12whn6p_17NLe",
      "name": "Cojeev UI reporting",
      "domains": [
        "000h.cojeev.com",
        "luv-jeri.github.io"
      ]
    },
    {
      "sitekey": "0x4AAAAAAEyz2_KCA2ZWrjKr",
      "name": "000h beta reporting",
      "domains": [
        "beta.000h.cojeev.com"
      ]
    }
  ],
  "reportingConfigs": {
    "production": {
      "publicSitekey": "0x4AAAAAAEt12whn6p_17NLe"
    },
    "beta": {
      "publicSitekey": "0x4AAAAAAEyz2_KCA2ZWrjKr"
    }
  }
}
```

## Step 8 — Origin preflight

All four expectations passed: each legacy origin is echoed only by its corresponding reporting host; the apex origin receives no Access-Control-Allow-Origin header.

```json
[
  {
    "host": "feedback.cojeev.com",
    "origin": "https://000h.cojeev.com",
    "allowOrigin": [
      "https://000h.cojeev.com"
    ],
    "expected": "echoed",
    "pass": true
  },
  {
    "host": "feedback.cojeev.com",
    "origin": "https://cojeev.com",
    "allowOrigin": [],
    "expected": "absent",
    "pass": true
  },
  {
    "host": "feedback-beta.cojeev.com",
    "origin": "https://beta.000h.cojeev.com",
    "allowOrigin": [
      "https://beta.000h.cojeev.com"
    ],
    "expected": "echoed",
    "pass": true
  },
  {
    "host": "feedback-beta.cojeev.com",
    "origin": "https://cojeev.com",
    "allowOrigin": [],
    "expected": "absent",
    "pass": true
  }
]
```

## Step 9 — Apex robots and source decision

- Request: `curl -sS -D "$OUT/apex-robots.before.headers" -o "$OUT/apex-robots.before.txt" -w '%{http_code}\n' https://cojeev.com/robots.txt`.
- Captured response: HTTP 404 at `Thu, 01 Oct 2026 18:19:41 GMT`.
- Body: zero bytes; `apex-robots.before.txt` is empty, as required for an absent robots file.
- Content-Type: header absent. No MIME type is inferred.
- Disallow rules: none.
- Source audit: `rg --files --hidden -g '*robots*' -g '!node_modules' -g '!dist' -g '!.git'` in `~/Developer/cojeev-coming-soon-performance-review/apps/cojeev-coming-soon` returned no source candidates.
- Robots source decision: **(b)**. B8 creates `apps/cojeev-coming-soon/public/robots.txt` containing only `Sitemap: https://cojeev.com/ui/sitemap.xml`. No coming-soon file was edited here.

## Fix round 1 — controller rulings

Ruling 1 is implemented in `scripts/release-phases.mjs:151`: missing Content-Type is represented by `null` only for absent `/robots.txt`. Empty strings, present robots with null, and non-robots null remain invalid. Regression tests were added first; the acceptance case failed before the change. All 61 release-phase tests then passed. Commit: `8100139`.

Ruling 2 is retained: the DNS and redirect-rule HTTP 403 markers under **Needs owner token** remain unknown inventories. They do not block the resumed reads. No owner token was supplied during this round, so these two reads were not repeated.

## Step 10 — Old-host installation and HTTP checks

Both C0 install verifiers completed with exit 0. Each freshly installed `button,cojeev,bento-builder` through the public shadcn CLI and passed TypeScript and Vite build. The only build warning concerned chunks larger than 500 kB. No screenshots or consumer runtime interaction checks were performed.

- production: publicCLIInstall PASS; typecheckAndBuild PASS; runtime 48.803 s. Receipt: `/tmp/cojeev-b1-r1.Mzlszx/install-production.json`.
- beta: publicCLIInstall PASS; typecheckAndBuild PASS; runtime 28.689 s. Receipt: `/tmp/cojeev-b1-r1.Mzlszx/install-beta.json`.

All eight status expectations passed:

```json
{
  "000h.cojeev.com": {
    "/": 200,
    "/docs/button/": 200,
    "/r/button.json": 200,
    "/health": 200
  },
  "beta.000h.cojeev.com": {
    "/": 200,
    "/docs/button/": 200,
    "/r/button.json": 200,
    "/health": 200
  }
}
```

## Step 11 — Apex probes

The robots entry preserves the step 9 captured response. The other four responses were read during this round. Content-Type parameters are removed; absent headers are faithfully recorded as null. Body hashes are SHA-256 over actual response bytes; bodies were not printed or retained.

```json
{
  "/": {
    "status": 200,
    "contentType": "text/html",
    "sha256": "a580129f11488af6eb49f02be96377af7b341163e70bdf9dbbe8974ea95a451d"
  },
  "/uikit?x=1": {
    "status": 404,
    "contentType": null,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "/uikit.txt?x=1": {
    "status": 404,
    "contentType": null,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "/ui-other.txt": {
    "status": 404,
    "contentType": null,
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "/robots.txt": {
    "status": 404,
    "contentType": null,
    "robots": "absent"
  }
}
```

## Stop — non-robots missing Content-Type

Live `/uikit?x=1`, `/uikit.txt?x=1` and `/ui-other.txt` returned HTTP 404, zero-byte bodies, and no Content-Type header. Ruling 1 explicitly requires nonempty Content-Type for every non-robots probe. A temporary candidate containing the actual step 5 version IDs, controller digests, and step 9/11 observations parses for beta but fails for production:

```text
beta: parsed
Invalid baseline record: production.apexProbes./uikit?x=1.contentType
```

The failing check is `readBaselineRecord('production', observedBaseline)` (exit 1). No MIME type was invented; the narrowly authorized schema change was not broadened. A controller ruling is required for missing Content-Type on these non-robots 404 probes.

## Steps 12–15 — stopped

- Step 12: not run; no D1 URL counts or report rows accessed.
- Step 13: not run; no browser-storage inventory claimed.
- Step 14: not run; no D1 recovery bookmarks obtained.
- Step 15: a complete record cannot parse. No invalid `scripts/release-baseline.json` was written into the repository. This README and the two captured robots files are committed as the partial record required by the stop rule.

## Verification and timing

Previous-round measured successful checks: 15.018 s (scope documented in the earlier report).

Fix-round measured check-running time: **89.916 s**: RED tests 0.057039 s; GREEN release-phase tests 0.138127 s; production install 48.803 s; beta install 28.689 s; HTTP probes 12.229 s. Install time includes dependency acquisition and consumer builds. The final baseline rejection and Git/diff reviews were not individually timed, so this is not total elapsed runtime.

Test writing, diagnosis, report writing and review were separate and not individually timed. Packaging: 0 s. No release archive was built. No app launches followed the stop.

C0 remains at `2337a6b608852149435306fe1111800e439e0d76`, with empty Git status and diff after the reads. Install receipts and operational scripts were kept outside C0 in `/tmp/cojeev-b1-r1.Mzlszx`. No pushes, PRs, deployments, Cloudflare mutations, GitHub settings changes, subagents or service setup occurred.

Output-rule incident: full reporting-config inspection and full Git commit metadata printed contact addresses. This violated the dispatch's output rule. Later operational output used allowed projections; no token, secret, report row or reporting attachment was printed. Contact addresses are not repeated in this record.
