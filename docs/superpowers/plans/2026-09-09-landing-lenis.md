# Landing Page Lenis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give only the Cojeev UI landing page a balanced Lenis smooth-scroll experience while preserving native mobile scrolling, anchors, documentation scrolling, and reduced-motion behavior.

**Architecture:** A focused client wrapper owns one Lenis instance while `LandingPage` is mounted. The application imports Lenis's recommended CSS once, while route scoping comes from mounting the wrapper only on `/`. A focused Playwright script proves real wheel interpolation, anchors, reduced motion, mobile touch, cleanup, and native documentation behavior.

**Tech Stack:** Next.js 16.3.4, React 19.2, TypeScript 5.9, Lenis 1.3.26, Playwright 1.58

## Global Constraints

- Activate Lenis only while the root landing page is mounted.
- Keep `syncTouch` disabled so iPhone and touch scrolling remain native.
- Keep Lenis's `respectReducedMotion: true` behavior.
- Preserve the `#playground` hero anchor and `#story-main` skip link.
- Do not add GSAP, scroll snapping, global scroll state, or a second manual animation loop.
- Destroy the Lenis instance when leaving the landing page.

---

### Task 1: Add the landing-only Lenis owner

**Files:**
- Create: `components/landing/landing-smooth-scroll.tsx`
- Modify: `components/landing/landing-page.tsx`
- Modify: `app/globals.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `Lenis` default export from `lenis`; `children: React.ReactNode`.
- Produces: `LandingSmoothScroll({ children }: { children: React.ReactNode }): React.JSX.Element` and a root element with `data-landing-smooth-scroll` for focused verification.

- [ ] **Step 1: Install the exact Lenis dependency**

Run: `npm install lenis@1.3.26 --save-exact`

Expected: `package.json` and `package-lock.json` record Lenis 1.3.26.

- [ ] **Step 2: Add the landing-only owner**

Create `components/landing/landing-smooth-scroll.tsx`:

```tsx
"use client";

import * as React from "react";
import Lenis from "lenis";

export function LandingSmoothScroll({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      respectReducedMotion: true,
      stopInertiaOnNavigate: true,
    });

    return () => lenis.destroy();
  }, []);

  return <div data-landing-smooth-scroll>{children}</div>;
}
```

- [ ] **Step 3: Scope it to `LandingPage`**

Import `LandingSmoothScroll` in `components/landing/landing-page.tsx` and wrap the existing `.story-page` element:

```tsx
return (
  <LandingSmoothScroll>
    <div className="story-page studio-page" data-quiet={quiet}>…</div>
  </LandingSmoothScroll>
);
```

- [ ] **Step 4: Import recommended CSS**

Add this alongside the existing imports at the top of `app/globals.css`:

```css
@import "lenis/dist/lenis.css";
```

- [ ] **Step 5: Run static checks**

Run: `npm run lint && npm run typecheck && npm test`

Expected: all commands exit 0.

- [ ] **Step 6: Commit the implementation**

```bash
git add app/globals.css components/landing/landing-page.tsx components/landing/landing-smooth-scroll.tsx package.json package-lock.json
git commit -m "feat: smooth landing page scrolling with Lenis"
```

### Task 2: Prove motion, accessibility, mobile, and route cleanup

**Files:**
- Create: `scripts/check-landing-smooth-scroll.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: static site under `/cojeev-ui/`, `[data-landing-smooth-scroll]`, Lenis root classes, and the existing `#playground` anchor.
- Produces: `npm run gate:smooth-scroll` and `artifacts/landing-smooth-scroll/results.json`.

- [ ] **Step 1: Write the browser test before validating the implementation**

Follow the existing production-gate server pattern. The test must collect page errors and assert:

```js
await page.goto(`${base}/`);
await page.locator("[data-landing-smooth-scroll]").waitFor();
assert.equal(await page.locator("html.lenis").count(), 1);

const frames = [];
await page.mouse.wheel(0, 700);
for (let index = 0; index < 5; index += 1) {
  await page.waitForTimeout(32);
  frames.push(await page.evaluate(() => scrollY));
}
assert(frames.some((value, index) => index > 0 && value > frames[index - 1]));
assert(frames.at(-1) < 700);

await page.getByRole("link", { name: /see what takes shape/i }).click();
await page.waitForFunction(() => location.hash === "#playground");
await page.locator("#playground").waitFor();

await page.emulateMedia({ reducedMotion: "reduce" });
await page.evaluate(() => scrollTo(0, 0));
await page.getByRole("link", { name: /see what takes shape/i }).click();
assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches));

await page.goto(`${base}/docs/`);
assert.equal(await page.locator("html.lenis").count(), 0);
assert.deepEqual(errors, []);
```

Add a WebKit iPhone 13 context that performs a touch scroll, confirms `scrollY > 0`, activates one landing control, and records zero runtime errors.

- [ ] **Step 2: Expose and run the focused gate**

Add to `package.json`:

```json
"gate:smooth-scroll": "node scripts/check-landing-smooth-scroll.mjs --serve"
```

Run: `npm run build && npm run gate:smooth-scroll`

Expected: the result file reports every check passing.

- [ ] **Step 3: Put the focused check before deployment**

Add this workflow step after `gate:marketing` and before evidence upload:

```yaml
- run: npm run gate:smooth-scroll
```

Include `artifacts/landing-smooth-scroll/` in the production evidence upload.

- [ ] **Step 4: Run the existing marketing regression gate**

Run: `npm run gate:marketing`

Expected: all six width/theme contexts pass with no overflow or runtime errors.

- [ ] **Step 5: Commit verification**

```bash
git add .github/workflows/verify.yml package.json package-lock.json scripts/check-landing-smooth-scroll.mjs
git commit -m "test: verify landing smooth scroll behavior"
```

### Task 3: Final release verification and publication

**Files:**
- Modify: `PUBLIC-SNAPSHOT.json`
- Modify: `RELEASE-0.2.0.md`

**Interfaces:**
- Consumes: the built landing page, focused test receipt, and GitHub Actions deployment result.
- Produces: a reproducible source snapshot and a live landing page containing Lenis 1.3.26.

- [ ] **Step 1: Run the release checks**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check:examples
npm run gate:smooth-scroll
npm run gate:marketing
```

Expected: every command exits 0.

- [ ] **Step 2: Update release records**

Record Lenis 1.3.26, the focused test result, changed file hashes, and the new source commit in the release report and public snapshot. Keep the component count at 124.

- [ ] **Step 3: Push and verify deployment**

Push the commits to `main`, wait for the existing verification workflow, then confirm:

```text
https://luv-jeri.github.io/cojeev-ui/
https://luv-jeri.github.io/cojeev-ui/r/registry.json
```

The landing page must expose the Lenis root class after hydration, the registry must still contain 124 UI entries, and documentation pages must remain native-scroll pages.
