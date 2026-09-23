/**
 * B-017 — the dark disabled Button must resolve to the handoff's own dark
 * disabled tokens.
 *
 * This is a *computed-style* regression check, not a selector-presence check.
 * It reads what the engine actually painted. Asserting that `:not(:disabled)`
 * appears in a stylesheet would pass even if the guard sat below a rule that
 * outranked it — which is precisely the failure mode this exists to catch.
 *
 * The expected values are parsed out of the *reference* token file
 * (`reference/cojeev-handoff-v4/tokens/tokens.css`, dark block), never read
 * back from the candidate. If the candidate's tokens drift this fails; if the
 * reference's dark disabled tokens change, this follows the contract.
 *
 *   node tests/button-disabled-tokens.browser.mjs              # the check
 *   node tests/button-disabled-tokens.browser.mjs --negative   # the control
 *
 * The check has two halves, because the docs page cannot reach the rule at
 * risk on its own:
 *
 *   1. Every disabled Button the docs page really renders — the six variant
 *      gallery figures plus the interactive specimen, which is `-accent`.
 *      `.v-btn:disabled` is variant-agnostic, so this proves the disabled
 *      tokens resolve across every treatment.
 *   2. A synthetic *default-variant* button (`button.v-btn[data-slot][disabled]`
 *      with no variant class), because the page renders NO default-variant
 *      Button at all — its variants are accent, secondary, ghost, outline,
 *      danger, block and card. `button.css:21` (the dark default rule) is the
 *      rule that outranks `.v-btn:disabled`, and without a default-variant
 *      element it would go unexercised. Verified: guarded it resolves to the
 *      disabled face; with the guard removed it collapses to --v-pink.
 *
 * Mutation control (`--negative`): inject `button.css:21` with its guard
 * removed *into the same cascade layer* (`cojeev-states`) and assert the
 * default-variant probe then collapses onto --v-pink. That proves the
 * unguarded rule genuinely outranks `.v-btn:disabled` in this cascade and that
 * these assertions are capable of failing.
 *
 * Why the control is needed at all: the disabled specimen carries BOTH the
 * native `disabled` attribute and `aria-disabled="true"`, and `button.css:21`
 * guards on both. Removing either clause alone changes nothing — the surviving
 * clause still excludes the button. Only removing the whole guard reproduces
 * the defect, so a mutation test that drops one clause is a false negative.
 * Do not "simplify" the control accordingly.
 *
 * Known, intentional deviation (do NOT "fix" this by editing the fixture):
 * `button-*-disabled-dark-*` stays FAILING in the visual gate. The reference
 * bundle's dark rule (`components-2.css:198`) has no disabled guard, so the
 * oracle contradicts its own written contract. Re-baselining the fixture needs
 * owner approval (CONTRIBUTING.md). See BUGS.md B-017.
 *
 * Runs against the existing docs server; never starts one.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.POLISH_URL ?? "http://127.0.0.1:4320/cojeev-ui";
const TOKENS = path.join(process.cwd(), "reference/cojeev-handoff-v4/tokens/tokens.css");
const negative = process.argv.includes("--negative");

/** Pull a `selector{…}` block by brace matching (the dark block spans lines). */
function cssBlock(css, selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `handoff tokens.css no longer declares ${selector}`);
  const open = css.indexOf("{", start);
  assert.notEqual(open, -1, `malformed block for ${selector}`);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block for ${selector} in handoff tokens.css`);
}

/** `#242019` -> `rgb(36, 32, 25)`, the form getComputedStyle returns. */
function hexToRgb(hex) {
  const value = hex.trim().replace("#", "");
  assert.match(value, /^[0-9A-Fa-f]{6}$/, `expected a 6-digit hex token, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

const tokensCss = fs.readFileSync(TOKENS, "utf8");
const rootVars = cssBlock(tokensCss, ":root{");
const darkVars = cssBlock(tokensCss, ':root[data-mode="dark"]');
/** Model the cascade: the dark block overrides :root, and inherits what it omits. */
const token = (name) => {
  for (const scope of [darkVars, rootVars]) {
    const match = scope.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
    if (match) return match[1];
  }
  throw new Error(`handoff tokens.css declares neither a dark nor a root --${name}`);
};

// The contract, straight from the reference's dark block.
const FACE = hexToRgb(token("v-disabled-face"));
const INK = hexToRgb(token("v-disabled-ink"));
const EDGE = hexToRgb(token("v-disabled-edge"));
// The enabled dark default-button face. Disabled must NOT collapse onto it.
const PINK = hexToRgb(token("v-pink"));

/** button.css:21 with its `:not(:disabled)` + aria-disabled guard removed, in-layer. */
const UNGUARDED_DARK = `@layer cojeev-states {
  :root[data-mode="dark"] .v-btn[data-slot]:not(.-accent):not(.-secondary):not(.-ghost):not(.-outline):not(.-danger) {
    background: var(--v-pink); color: var(--v-on-accent);
  }
}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE}/docs/button/`);
  await page.locator('[data-example="button"]').first().waitFor();
  await page.getByRole("switch", { name: "Dark appearance", exact: true }).setChecked(true);
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.mode),
    "dark",
    "the appearance switch did not put the document in dark mode",
  );

  /** A default-variant dark disabled Button, measured through the real stylesheets. */
  const defaultVariantProbe = () =>
    page.evaluate(() => {
      const el = document.createElement("button");
      el.className = "v-btn";
      el.setAttribute("data-slot", "button");
      el.setAttribute("disabled", "");
      el.textContent = "probe";
      document.body.appendChild(el);
      const css = getComputedStyle(el);
      const paint = { background: css.backgroundColor, color: css.color, boxShadow: css.boxShadow, cursor: css.cursor };
      el.remove();
      return paint;
    });

  if (negative) {
    assert.equal(
      (await defaultVariantProbe()).background,
      FACE,
      "control must start from the guarded face",
    );
    await page.addStyleTag({ content: UNGUARDED_DARK });
    await page.waitForTimeout(200);
    assert.equal(
      (await defaultVariantProbe()).background,
      PINK,
      "negative control failed: an unguarded dark rule did not outrank .v-btn:disabled, so the positive assertions prove nothing",
    );
    console.log(
      `FAIL-AS-EXPECTED B-017 negative control: dropping the whole guard collapses the default-variant disabled face onto the enabled ${PINK}`,
    );
    console.log("PASS B-017 negative control: the guard is load-bearing and these assertions can fail");
    process.exit(0);
  }

  // Half 1 — the default variant, i.e. the exact rule the fixture disagreement is about.
  const probePaint = await defaultVariantProbe();
  assert.equal(probePaint.background, FACE, `default variant: dark disabled face must be --v-disabled-face (${FACE})`);
  assert.equal(probePaint.color, INK, `default variant: dark disabled ink must be --v-disabled-ink (${INK})`);
  assert.ok(
    probePaint.boxShadow.includes(EDGE),
    `default variant: disabled ring must be --v-disabled-edge (${EDGE}), got ${probePaint.boxShadow}`,
  );

  // Half 2 — every disabled Button the page really renders.
  const variants = page.getByRole("region", { name: "Variants", exact: true });
  const specimens = [
    ["interactive specimen", page.locator('[data-example="button"]').first()],
    ...["Accent", "Secondary", "Ghost", "Outline", "Danger", "Block"].map((name) => [
      name,
      variants.getByRole("figure", { name, exact: true }),
    ]),
  ];
  const ringed = [];
  const borderless = [];
  for (const [name, scope] of specimens) {
    const button = scope.getByRole("button", { name: "Disabled", exact: true }).first();
    assert.equal(await button.count(), 1, `${name}: expected exactly one disabled Button`);
    await button.scrollIntoViewIfNeeded();
    assert.equal(await button.isDisabled(), true, `${name}: specimen must be genuinely disabled`);
    const paint = await button.evaluate((el) => {
      const css = getComputedStyle(el);
      return { background: css.backgroundColor, color: css.color, boxShadow: css.boxShadow, cursor: css.cursor };
    });

    assert.equal(paint.background, FACE, `${name}: dark disabled face must be --v-disabled-face (${FACE})`);
    assert.equal(paint.color, INK, `${name}: dark disabled ink must be --v-disabled-ink (${INK})`);
    assert.notEqual(
      paint.background,
      PINK,
      `${name}: disabled collapsed onto the enabled dark face (${PINK}) — the disabled guard is not biting`,
    );
    assert.equal(paint.cursor, "not-allowed", `${name}: disabled affordance lost`);

    // The ring is the edge token, but a borderless variant legitimately has none.
    if (paint.boxShadow === "none") borderless.push(name);
    else {
      assert.ok(
        paint.boxShadow.includes(EDGE),
        `${name}: disabled ring must be --v-disabled-edge (${EDGE}), got ${paint.boxShadow}`,
      );
      ringed.push(name);
    }
  }

  // A guard that only worked for one variant would not be a guard.
  assert.ok(ringed.length >= 6, `expected the ring on at least six specimens, saw ${ringed.length}`);
  assert.deepEqual(
    borderless,
    ["Outline"],
    `only the borderless Outline variant may omit the inset ring; saw ${JSON.stringify(borderless)}`,
  );

  console.log(
    `PASS B-017 default-variant dark disabled Button resolves to the handoff's own dark tokens: ` +
      `face ${FACE}, ink ${INK}, ring ${EDGE}`,
  );
  console.log(
    `PASS B-017 the same tokens resolve across ${specimens.length} rendered disabled specimens; ` +
      `Outline is the sole ringless variant`,
  );
  console.log(
    "NOTE B-017 reference fixture button-*-disabled-dark-* remains an intentional FAIL: " +
      "the reference bundle's dark rule has no disabled guard and contradicts its own contract. Re-baselining needs owner approval.",
  );
} finally {
  await browser.close();
}
