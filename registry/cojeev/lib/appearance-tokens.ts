/** Palette roles are computed in sRGB. Contrast changes inks and boundaries,
 * never a CSS filter over the page or the user's images. */
export type PaletteTokens = { light: Record<string, string>; dark: Record<string, string> };
export type Palette = {
  id: "paper" | "tide" | "grove" | "clay" | "orchid" | "graphite";
  name: string;
  description: string;
  light: readonly [string, string, string];
  dark: readonly [string, string, string];
  accents: readonly [string, string, string, string];
  /** `paper` is the supplied design system, so it carries the handoff's literal
   * token values rather than deriving them. Without this, first paint
   * (`tokens.css`) and what AppearanceProvider writes on hydration disagree, and
   * the page visibly changes colour the moment React mounts. */
  tokens?: PaletteTokens;
  /** Minimum text contrast this palette's muted ink actually meets. Every palette
   * clears WCAG AA (4.5), including the handoff one — see the `--v-text-3` note
   * inside `paper.tokens.dark`. */
  mutedInkContrast: number;
};
export const palettes: readonly Palette[] = [
  { id: "paper", name: "Paper", description: "Warm paper, crisp ink", light: ["#FBF4E6", "#F7F5EB", "#EEE7DA"], dark: ["#171512", "#2F2B25", "#221F1B"], accents: ["#F5B8DB", "#A8BC75", "#95BAE8", "#F1D369"],
    mutedInkContrast: 4.5,
    tokens: {
      light: {
        "--v-canvas": "#FBF4E6", "--v-paper": "#FBF4E6", "--v-beige": "#EEE7DA",
        "--v-beige-2": "#F3ECDF", "--v-cream-pill": "#F7F5EB", "--v-text": "#0E0B0B",
        "--v-text-2": "#5F5B55", "--v-text-3": "#68645E", "--v-ink": "#111111",
        "--v-ink-soft": "#32302F", "--v-on-ink": "#FBF4E6", "--v-border": "#D9D2C4",
        "--v-edge": "#87806F", "--v-on-accent": "#111111", "--v-brand": "#9C3E6E",
        "--v-accent-ink": "#8E4A6B", "--v-olive-ink": "#5A6631", "--v-disabled-face": "#EDE6D7",
        "--v-disabled-ink": "#6A635B", "--v-disabled-edge": "#877F6F",
        "--v-disabled-fill": "#C7C2B7", "--btn-disabled-ink": "#4A453D",
        "--unavail-ink": "#6E6A63", "--alert-ink": "#3E3A34", "--nav-group-ink": "#8E8674",
        "--v-skel-face": "#DACFB8", "--v-skel-sheen": "#F4EDDF", "--v-skel-edge": "#8C8474",
        "--sel-bg": "#F5DCEA", "--sel-ink": "#0E0B0B", "--sel-edge": "#C2739B",
        "--switch-knob": "#FBF4E6", "--switch-knob-on": "#FBF4E6", "--v-structure": "#111111",
        "--on-structure": "#FBF4E6", "--structure-text": "#E4DDCD",
        "--structure-quiet": "rgba(251,244,230,.09)", "--structure-line": "rgba(251,244,230,.16)",
        "--sidebar-muted": "#8B8474", "--surface-quiet": "#F7F1E2", "--surface-work": "#EFF2F7",
        "--surface-automation": "#F9F2DC", "--surface-memory": "#F0F2E4",
        "--surface-library": "#F9EEF3", "--surface-ai": "#EDF1F6", "--surface-alert": "#F9EDE9",
        "--v-danger": "#E1443E", "--v-danger-fill": "#C9332D", "--v-danger-ink": "#A8302B",
        "--v-danger-soft": "color-mix(in oklab,var(--v-danger) 14%,var(--v-canvas))",
        "--v-scrim": "rgba(46,42,36,.46)", "--glide-bg": "#1A1714", "--glide-fg": "#F6EFE2",
        "--card": "var(--v-beige)", "--popover": "var(--v-canvas)",
        "--accent-foreground": "var(--v-text)", "--destructive": "var(--v-danger)",
        "--v-pink": "#F5B8DB", "--v-pink-deep": "#E09CC1",
        "--v-pink-soft": "color-mix(in oklab,var(--v-pink) 55%,var(--v-canvas))",
        "--v-olive": "#9AAB63", "--v-olive-deep": "#808F53",
        "--v-olive-soft": "color-mix(in oklab,var(--v-olive) 45%,var(--v-canvas))",
        "--v-blue": "#B6CAEB", "--v-blue-deep": "#8BA2C8",
        "--v-blue-soft": "color-mix(in oklab,var(--v-blue) 55%,var(--v-canvas))",
        "--v-yellow": "#F5D867", "--v-yellow-deep": "#E8C84D",
        "--v-yellow-soft": "color-mix(in oklab,var(--v-yellow) 55%,var(--v-canvas))",
        "--status-ok-bg": "#E9EEDB", "--status-ok-ink": "#3F5220", "--status-warn-bg": "#FAF0D2",
        "--status-warn-ink": "#6A4E10", "--status-danger-bg": "#F9E2DD",
        "--status-danger-ink": "#8C2F24", "--status-info-bg": "#E4EAF4",
        "--status-info-ink": "#2A4468", "--status-pending-bg": "#ECE7DC",
        "--status-pending-ink": "#4A453D"
      },
      dark: {
        /* One deliberate deviation from the handoff, and only one.
         *
         * The handoff's dark `--v-text-3` is `#6E675E`, which measures 3.27:1 on
         * this canvas and 2.94:1 on this beige — below WCAG AA (4.5:1) for text
         * that small. The handoff's own light mode passes at 5.37:1, so this is a
         * dark-mode oversight rather than a palette intent.
         *
         * `#90897F` is a minimal step from `#6E675E` toward the handoff's own
         * dark primary text `#F6EFE2` that clears AA on both surfaces (5.27:1 and
         * 4.74:1). Same warm hue, same family, no new colour introduced. It is NOT
         * proven to be the smallest: a 22.5% mix instead of 25% gives `#8D867C`, about
         * 5.06:1 / 4.56:1, which also clears AA. The step was chosen to stay on the
         * existing 25% blend rather than to minimise distance. Recorded
         * here because a silent correction of the design system would be worse than
         * the deviation itself. Handoff value retained in `reference/`, untouched.
         *
         * CSS uses the same accessible value before hydration. The frozen
         * reference retains its original value; this deviation is intentional. */
        "--v-canvas": "#171512", "--v-paper": "#FBF4E6", "--v-beige": "#221F1B",
        "--v-beige-2": "#2A2621", "--v-cream-pill": "#2F2B25", "--v-text": "#F6EFE2",
        "--v-text-2": "#B5AC9E", "--v-text-3": "#90897F", "--v-ink": "#FBF4E6",
        "--v-ink-soft": "#E4DCCB", "--v-on-ink": "#111111", "--v-border": "#3A352E",
        "--v-edge": "#87806F", "--v-on-accent": "#111111", "--v-brand": "#9C3E6E",
        "--v-accent-ink": "#EDA9C8", "--v-olive-ink": "#5A6631", "--v-disabled-face": "#242019",
        "--v-disabled-ink": "#A79E90", "--v-disabled-edge": "#7E7565",
        "--v-disabled-fill": "#3A352E", "--btn-disabled-ink": "#4A453D",
        "--unavail-ink": "#6E6A63", "--alert-ink": "#3E3A34", "--nav-group-ink": "#8E8674",
        "--v-skel-face": "#4A4238", "--v-skel-sheen": "#5C5346", "--v-skel-edge": "#7A7263",
        "--sel-bg": "#3A2430", "--sel-ink": "#F6EFE2", "--sel-edge": "#C2739B",
        "--switch-knob": "#F6EFE2", "--switch-knob-on": "#171512", "--v-structure": "#0C0B0A",
        "--on-structure": "#F6EFE2", "--structure-text": "#DED6C6",
        "--structure-quiet": "rgba(246,239,226,.08)", "--structure-line": "rgba(246,239,226,.14)",
        "--sidebar-muted": "#8B8474", "--surface-quiet": "#201D19", "--surface-work": "#1B1F26",
        "--surface-automation": "#241F14", "--surface-memory": "#1D2118",
        "--surface-library": "#241A1F", "--surface-ai": "#1A1F26", "--surface-alert": "#251A17",
        "--v-danger": "#E1443E", "--v-danger-fill": "#C9332D", "--v-danger-ink": "#F0A99C",
        "--v-danger-soft": "color-mix(in oklab,var(--v-danger) 14%,var(--v-canvas))",
        "--v-scrim": "rgba(0,0,0,.62)", "--glide-bg": "#0C0B0A", "--glide-fg": "#F6EFE2",
        "--card": "var(--v-beige)", "--popover": "var(--v-canvas)",
        "--accent-foreground": "var(--v-text)", "--destructive": "var(--v-danger)",
        "--v-pink": "#F5B8DB", "--v-pink-deep": "#E09CC1",
        "--v-pink-soft": "color-mix(in oklab,var(--v-pink) 55%,var(--v-canvas))",
        "--v-olive": "#9AAB63", "--v-olive-deep": "#808F53",
        "--v-olive-soft": "color-mix(in oklab,var(--v-olive) 45%,var(--v-canvas))",
        "--v-blue": "#B6CAEB", "--v-blue-deep": "#8BA2C8",
        "--v-blue-soft": "color-mix(in oklab,var(--v-blue) 55%,var(--v-canvas))",
        "--v-yellow": "#F5D867", "--v-yellow-deep": "#E8C84D",
        "--v-yellow-soft": "color-mix(in oklab,var(--v-yellow) 55%,var(--v-canvas))",
        "--status-ok-bg": "#1E2617", "--status-ok-ink": "#C3D69B", "--status-warn-bg": "#2A2312",
        "--status-warn-ink": "#E8CE86", "--status-danger-bg": "#2C1A16",
        "--status-danger-ink": "#F0AFA3", "--status-info-bg": "#182130",
        "--status-info-ink": "#AEC5E6", "--status-pending-bg": "#242019",
        "--status-pending-ink": "#CFC7B8"
      },
    } },
  { id: "tide", name: "Tide", description: "Clear blue, sea glass", light: ["#F1F6F9", "#FFFFFF", "#DFE9F0"], dark: ["#101B24", "#192A37", "#233947"], accents: ["#DAA8D5", "#8BC3B2", "#82BCEB", "#EFCD79"],
    mutedInkContrast: 4.5 },
  { id: "grove", name: "Grove", description: "Leaf greens, quiet light", light: ["#F4F6ED", "#FCFEF8", "#E4EADA"], dark: ["#141C15", "#213026", "#2D3D30"], accents: ["#E4A8B2", "#B1CA78", "#A5C7D9", "#E7CE85"],
    mutedInkContrast: 4.5 },
  { id: "clay", name: "Clay", description: "Terracotta, golden warmth", light: ["#FBF3EB", "#FFFCF7", "#EFDFD2"], dark: ["#211814", "#30231F", "#3F3028"], accents: ["#EDA992", "#B7C281", "#A4BCCF", "#F1CB7A"],
    mutedInkContrast: 4.5 },
  { id: "orchid", name: "Orchid", description: "Lavender, soft violet", light: ["#F7F3FA", "#FFFCFF", "#E9E0F0"], dark: ["#1B1521", "#2A2133", "#382C43"], accents: ["#D6ADEE", "#B7C993", "#A6BCEC", "#F0D18C"],
    mutedInkContrast: 4.5 },
  { id: "graphite", name: "Graphite", description: "Cool neutrals, clean focus", light: ["#F4F5F6", "#FFFFFF", "#E5E8EB"], dark: ["#111418", "#20252C", "#2C333D"], accents: ["#E9ACC5", "#B4C3A0", "#ABBEDC", "#E7CF98"],
    mutedInkContrast: 4.5 },
] as const;
export type PaletteName = typeof palettes[number]["id"];
export type AppearanceSettings = { palette: PaletteName; contrast: number };
export const defaultAppearance: AppearanceSettings = Object.freeze({ palette: "paper", contrast: 60 });

export function normalizeAppearance(value: unknown): AppearanceSettings {
  const input = value && typeof value === "object" ? value as Partial<AppearanceSettings> : {};
  return {
    palette: palettes.some(p => p.id === input.palette) ? input.palette! : defaultAppearance.palette,
    contrast: typeof input.contrast === "number" && Number.isFinite(input.contrast) ? Math.max(0, Math.min(100, input.contrast)) : defaultAppearance.contrast,
  };
}
function rgb(hex: string): number[] { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
export function mixColor(a: string, b: string, amount: number): string {
  const av = rgb(a), bv = rgb(b);
  return "#" + av.map((v, i) => Math.round(v + (bv[i] - v) * Math.max(0, Math.min(1, amount))).toString(16).padStart(2, "0")).join("");
}
export function luminance(hex: string): number {
  const channels = rgb(hex).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
/** Nearest blend toward the mode's ink that clears every supplied surface. */
export function readableInk(seed: string, surfaces: readonly string[], target: number, dark: boolean): string {
  const end = dark ? "#FFFFFF" : "#080A0D";
  if (surfaces.every(bg => contrastRatio(seed, bg) >= target)) return seed;
  let low = 0, high = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (low + high) / 2;
    if (surfaces.every(bg => contrastRatio(mixColor(seed, end, mid), bg) >= target)) high = mid;
    else low = mid;
  }
  return mixColor(seed, end, high);
}

export function appearanceTokens(settings: AppearanceSettings, mode: "light" | "dark"): Record<string, string> {
  const normalized = normalizeAppearance(settings);
  const palette = palettes.find(p => p.id === normalized.palette)!;
  const dark = mode === "dark", amount = normalized.contrast / 100;
  const [canvas, paper, inset] = palette[mode];
  const surfaces = [canvas, paper, inset];
  const seed = dark ? "#7E858E" : "#727781";
  const text = readableInk(seed, surfaces, 8 + amount * 7, dark);
  const secondary = readableInk(seed, surfaces, 5 + amount * 4, dark);
  const muted = readableInk(seed, surfaces, 4.6 + amount * 2.4, dark);
  const edge = readableInk(inset, surfaces, 3.1 + amount * 1.8, dark);
  const line = readableInk(inset, [canvas, paper], 1.45 + amount * .9, dark);
  const [pink, olive, blue, yellow] = palette.accents;
  const tint = (accent: string, weight = dark ? .12 : .13) => mixColor(paper, accent, weight);
  const selection = tint(pink, dark ? .17 : .24);
  const selectionInk = readableInk(text, [selection], 7 + amount * 3, dark);
  const accentInk = "#14171B";
  /* Derived values come first; a palette that ships literal tokens (only `paper`,
   * which mirrors the supplied handoff) overrides them. Palette-specific values
   * are applied after the tone and status loops so an explicit accent also wins
   * over the computed one. */
  const derived: Record<string, string> = {
    "--v-canvas": canvas, "--v-paper": paper, "--v-beige": inset,
    "--v-beige-2": mixColor(canvas, inset, .55), "--v-cream-pill": paper,
    "--v-text": text, "--v-text-2": secondary, "--v-text-3": muted,
    "--v-ink": text, "--v-ink-soft": secondary, "--v-on-ink": canvas,
    "--v-border": line, "--v-edge": edge, "--v-on-accent": accentInk,
    "--v-brand": readableInk(pink, surfaces, 4.6, dark),
    "--v-accent-ink": readableInk(pink, surfaces, 4.6 + amount * 2, dark),
    "--v-olive-ink": readableInk(olive, surfaces, 4.6 + amount * 2, dark),
    "--v-disabled-face": inset, "--v-disabled-ink": muted, "--v-disabled-edge": edge,
    "--v-disabled-fill": inset, "--btn-disabled-ink": muted, "--unavail-ink": muted,
    "--alert-ink": secondary, "--nav-group-ink": muted,
    "--v-skel-face": inset, "--v-skel-sheen": paper, "--v-skel-edge": line,
    "--sel-bg": selection, "--sel-ink": selectionInk,
    "--sel-edge": readableInk(pink, [...surfaces, selection], 3.1, dark),
    "--switch-knob": paper, "--switch-knob-on": accentInk,
    "--v-structure": "#14171B", "--on-structure": "#F9FAFC", "--structure-text": "#E2E6ED",
    "--structure-quiet": "#242931", "--structure-line": "#565D68", "--sidebar-muted": "#B4BDCA",
    "--surface-quiet": paper, "--surface-work": tint(blue), "--surface-automation": tint(yellow),
    "--surface-memory": tint(olive), "--surface-library": tint(pink), "--surface-ai": tint(blue), "--surface-alert": tint("#E88B7A"),
    "--v-danger": "#D7473C", "--v-danger-fill": "#B92D28", "--v-danger-ink": readableInk("#DB5146", surfaces, 4.6, dark),
    "--v-danger-soft": tint("#D7473C"), "--v-scrim": dark ? "rgba(0,0,0,.66)" : "rgba(19,24,32,.46)",
    "--glide-bg": "#14171B", "--glide-fg": "#F9FAFC",
    "--card": "var(--v-paper)", "--popover": "var(--v-paper)",
    "--accent-foreground": "var(--v-on-accent)", "--destructive": "var(--v-danger-fill)",
  };
  const tokens: Record<string, string> = { ...derived };
  ["pink", "olive", "blue", "yellow"].forEach((tone, i) => {
    const color = palette.accents[i];
    tokens[`--v-${tone}`] = color;
    tokens[`--v-${tone}-deep`] = mixColor(color, "#14171B", .12);
    tokens[`--v-${tone}-soft`] = tint(color, dark ? .15 : .24);
  });
  ["ok", "warn", "danger", "info", "pending"].forEach((state, i) => {
    const color = [olive, yellow, "#D7473C", blue, secondary][i];
    const bg = tint(color);
    tokens[`--status-${state}-bg`] = bg;
    tokens[`--status-${state}-ink`] = readableInk(color, [bg], 5 + amount * 2, dark);
  });
  // A palette carrying literal handoff tokens overrides everything derived above,
  // so first paint and post-hydration values are identical by construction.
  if (!palette.tokens) return tokens;
  return { ...tokens, ...palette.tokens[mode] };
}
