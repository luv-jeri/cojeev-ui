import assert from "node:assert/strict";
import test from "node:test";
import { appearanceTokens, contrastRatio, normalizeAppearance, palettes } from "../registry/cojeev/lib/appearance-tokens";

test("all palettes retain readable role pairs at every contrast level in both modes", () => {
  for (const palette of palettes) for (const mode of ["light", "dark"] as const) for (const contrast of [0, 25, 50, 75, 100]) {
    const t = appearanceTokens({ palette: palette.id, contrast }, mode);
    for (const surface of ["--v-canvas", "--v-paper", "--v-beige"]) {
      for (const ink of ["--v-text", "--v-text-2", "--v-text-3"]) assert.ok(contrastRatio(t[ink], t[surface]) >= 4.5, `${palette.id}/${mode}/${contrast} ${ink} on ${surface}`);
      assert.ok(contrastRatio(t["--v-edge"], t[surface]) >= 3, `${palette.id}/${mode} control edge`);
    }
    assert.ok(contrastRatio(t["--sel-ink"], t["--sel-bg"]) >= 4.5);
    for (const state of ["ok", "warn", "danger", "info", "pending"]) assert.ok(contrastRatio(t[`--status-${state}-ink`], t[`--status-${state}-bg`]) >= 4.5);
    for (const accent of palette.accents) assert.ok(contrastRatio(t["--v-on-accent"], accent) >= 4.5);
  }
});
test("contrast strengthens secondary text without filtering or changing the accent palette", () => {
  for (const palette of palettes) for (const mode of ["light", "dark"] as const) {
    const low = appearanceTokens({ palette: palette.id, contrast: 0 }, mode), high = appearanceTokens({ palette: palette.id, contrast: 100 }, mode);
    assert.ok(contrastRatio(high["--v-text-2"], high["--v-paper"]) > contrastRatio(low["--v-text-2"], low["--v-paper"]));
    assert.equal(low["--v-pink"], high["--v-pink"]);
    assert.equal(low["--v-paper"], high["--v-paper"]);
  }
});
test("stored or controlled preferences are validated", () => {
  assert.deepEqual(normalizeAppearance({ palette: "unknown", contrast: NaN }), { palette: "paper", contrast: 60 });
  assert.equal(normalizeAppearance({ contrast: -100 }).contrast, 0);
  assert.equal(normalizeAppearance({ contrast: 1000 }).contrast, 100);
  assert.deepEqual(normalizeAppearance(null), { palette: "paper", contrast: 60 });
});
