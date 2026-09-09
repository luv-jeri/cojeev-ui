# TOKENS.md — Cojeev Design System design tokens

Source of truth: `vriksha/css/tokens.css` (light); dark under `:root[data-mode="dark"]` is a derived extension. Labels: [E]xplicit (printed on I03) · [M]easured · [O]bserved · [I]nferred. Semantic roles use shadcn names.

| Token | Value | Note |
|---|---|---|
| `--v-pink` | `#F5B8DB` | accents [E] I03 |
| `--v-olive` | `#9AAB63` | accents [E] I03 |
| `--v-blue` | `#B6CAEB` | accents [E] I03 |
| `--v-yellow` | `#F5D867` | accents [E] I03 |
| `--v-canvas` | `#FBF4E6` | surfaces [M] |
| `--v-beige` | `#EEE7DA` | surfaces [M] |
| `--v-beige-2` | `#F3ECDF` | surfaces [M] |
| `--v-cream-pill` | `#F7F5EB` | surfaces [M] |
| `--v-ink` | `#111111` | surfaces [M] |
| `--v-ink-soft` | `#32302F` | surfaces [M] |
| `--v-on-ink` | `#FBF4E6` | surfaces [M] |
| `--v-text` | `#0E0B0B` | text [M] |
| `--v-text-2` | `#5F5B55` | text [M] |
| `--v-text-3` | `#A19C97` | text [M] |
| `--v-danger` | `#E1443E` | semantic hues |
| `--v-danger-ink` | `#A8302B` | text-only danger ink — 5.4:1 on danger-soft, 6.0:1 on beige [I] |
| `--v-brand` | `#9C3E6E` | semantic hues |
| `--v-border` | `#D9D2C4` | semantic hues |
| `--v-scrim` | `rgba(238,231,218,.72)` | semantic hues |
| `--v-disabled-fill` | `#C7C2B7` | semantic hues |
| `--v-pink-deep` | `#E09CC1` | tonal watermarks [M] ≈ accent 88% + black |
| `--v-olive-deep` | `#808F53` | tonal watermarks [M] ≈ accent 88% + black |
| `--v-blue-deep` | `#8BA2C8` | tonal watermarks [M] ≈ accent 88% + black |
| `--v-yellow-deep` | `#E8C84D` | tonal watermarks [M] ≈ accent 88% + black |
| `--v-pink-soft` | `color-mix(in oklab,var(--v-pink) 55%,var(--v-canvas))` | soft tints for tag pills on beige [I] |
| `--v-olive-soft` | `color-mix(in oklab,var(--v-olive) 45%,var(--v-canvas))` | soft tints for tag pills on beige [I] |
| `--v-blue-soft` | `color-mix(in oklab,var(--v-blue) 55%,var(--v-canvas))` | soft tints for tag pills on beige [I] |
| `--v-yellow-soft` | `color-mix(in oklab,var(--v-yellow) 55%,var(--v-canvas))` | soft tints for tag pills on beige [I] |
| `--v-danger-soft` | `color-mix(in oklab,var(--v-danger) 14%,var(--v-canvas))` | soft tints for tag pills on beige [I] |
| `--background` | `var(--v-canvas)` | semantic roles (shadcn-style names) |
| `--foreground` | `var(--v-text)` | semantic roles (shadcn-style names) |
| `--card` | `var(--v-beige)` | semantic roles (shadcn-style names) |
| `--card-foreground` | `var(--v-text)` | semantic roles (shadcn-style names) |
| `--card-2` | `var(--v-beige-2)` | semantic roles (shadcn-style names) |
| `--popover` | `var(--v-canvas)` | semantic roles (shadcn-style names) |
| `--popover-foreground` | `var(--v-text)` | semantic roles (shadcn-style names) |
| `--primary` | `var(--v-ink)` | semantic roles (shadcn-style names) |
| `--primary-foreground` | `var(--v-on-ink)` | semantic roles (shadcn-style names) |
| `--secondary` | `var(--v-beige)` | semantic roles (shadcn-style names) |
| `--secondary-foreground` | `var(--v-text)` | semantic roles (shadcn-style names) |
| `--accent` | `var(--v-pink)` | semantic roles (shadcn-style names) |
| `--accent-foreground` | `var(--v-text)` | semantic roles (shadcn-style names) |
| `--muted` | `var(--v-beige-2)` | semantic roles (shadcn-style names) |
| `--muted-foreground` | `var(--v-text-2)` | semantic roles (shadcn-style names) |
| `--border` | `var(--v-border)` | semantic roles (shadcn-style names) |
| `--input` | `var(--v-beige)` | semantic roles (shadcn-style names) |
| `--ring` | `var(--v-brand)` | semantic roles (shadcn-style names) |
| `--destructive` | `var(--v-danger)` | semantic roles (shadcn-style names) |
| `--destructive-foreground` | `#fff` | semantic roles (shadcn-style names) |
| `--chart-1` | `var(--v-yellow)` | semantic roles (shadcn-style names) |
| `--chart-2` | `var(--v-pink)` | semantic roles (shadcn-style names) |
| `--chart-3` | `var(--v-olive)` | semantic roles (shadcn-style names) |
| `--chart-4` | `var(--v-blue)` | semantic roles (shadcn-style names) |
| `--chart-5` | `var(--v-ink)` | semantic roles (shadcn-style names) |
| `--sidebar` | `var(--v-ink)` | semantic roles (shadcn-style names) |
| `--sidebar-foreground` | `var(--v-on-ink)` | semantic roles (shadcn-style names) |
| `--sidebar-muted` | `#8B8474` | semantic roles (shadcn-style names) |
| `--sidebar-primary` | `var(--v-pink)` | semantic roles (shadcn-style names) |
| `--cat-work` | `var(--v-blue)` | categories (decision) |
| `--cat-automations` | `var(--v-yellow)` | categories (decision) |
| `--cat-memory` | `var(--v-olive)` | categories (decision) |
| `--cat-library` | `var(--v-pink)` | categories (decision) |
| `--cat-ai-apps` | `var(--v-blue)` | categories (decision) |
| `--cat-free-models` | `var(--v-olive)` | categories (decision) |
| `--cat-settings` | `var(--v-beige)` | categories (decision) |
| `--cat-needs-you` | `var(--v-pink)` | categories (decision) |
| `--cat-runs` | `var(--v-yellow)` | categories (decision) |
| `--status-ok` | `var(--v-olive)` | status words — always paired with text/icon |
| `--status-warn` | `var(--v-yellow)` | status words — always paired with text/icon |
| `--status-danger` | `var(--v-danger)` | status words — always paired with text/icon |
| `--status-info` | `var(--v-blue)` | status words — always paired with text/icon |
| `--status-pending` | `var(--v-ink-soft)` | status words — always paired with text/icon |
| `--status-off` | `var(--v-text-3)` | status words — always paired with text/icon |
| `--font-display` | `"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif` | type |
| `--font-text` | `"DM Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif` | type |
| `--font-mono` | `ui-monospace,"SF Mono",Menlo,monospace` | type |
| `--fs-hero` | `72px` | type |
| `--fs-display` | `44px` | type |
| `--fs-section` | `26px` | type |
| `--fs-title` | `21px` | type |
| `--fs-lead` | `17px` | type |
| `--fs-body` | `15px` | type |
| `--fs-control` | `14px` | type |
| `--fs-meta` | `12px` | type |
| `--fs-caps` | `11px` | type |
| `--lh-hero` | `.95` | type |
| `--lh-display` | `1.05` | type |
| `--lh-title` | `1.2` | type |
| `--lh-body` | `1.45` | type |
| `--lh-control` | `1.2` | type |
| `--fw-display` | `500` | type |
| `--fw-title` | `600` | type |
| `--fw-body` | `400` | type |
| `--fw-control` | `500` | type |
| `--fw-value` | `700` | type |
| `--ls-display` | `-.015em` | type |
| `--ls-hero` | `-.03em` | type |
| `--ls-caps` | `.06em` | type |
| `--s-1` | `4px` | space (4-grid) [I] |
| `--s-2` | `8px` | space (4-grid) [I] |
| `--s-3` | `12px` | space (4-grid) [I] |
| `--s-4` | `16px` | space (4-grid) [I] |
| `--s-5` | `20px` | space (4-grid) [I] |
| `--s-6` | `24px` | space (4-grid) [I] |
| `--s-8` | `32px` | space (4-grid) [I] |
| `--s-10` | `40px` | space (4-grid) [I] |
| `--s-12` | `48px` | space (4-grid) [I] |
| `--s-16` | `64px` | space (4-grid) [I] |
| `--shell-inset` | `28px` | layout [M] I15 → 1440 |
| `--sidebar-w` | `212px` | layout [M] I15 → 1440 |
| `--sidebar-w-mini` | `76px` | layout [M] I15 → 1440 |
| `--sidebar-gap` | `52px` | layout [M] I15 → 1440 |
| `--rail-w` | `360px` | layout [M] I15 → 1440 |
| `--rail-gap` | `40px` | layout [M] I15 → 1440 |
| `--topbar-h` | `44px` | layout [M] I15 → 1440 |
| `--content-max` | `1440px` | layout [M] I15 → 1440 |
| `--card-pad` | `24px` | layout [M] I15 → 1440 |
| `--card-gap` | `16px` | layout [M] I15 → 1440 |
| `--row-pad` | `12px 16px` | layout [M] I15 → 1440 |
| `--item-h` | `64px` | layout [M] I15 → 1440 |
| `--content-offset` | `16px` | layout [M] I15 → 1440 |
| `--agenda-slot` | `80px` | layout [M] I15 → 1440 |
| `--r-xs` | `4px` | radius [M/I] |
| `--r-sm` | `8px` | radius [M/I] |
| `--r-md` | `12px` | radius [M/I] |
| `--r-card-sm` | `16px` | radius [M/I] |
| `--r-card` | `20px` | radius [M/I] |
| `--r-panel` | `24px` | radius [M/I] |
| `--r-sheet` | `28px` | radius [M/I] |
| `--r-frame` | `40px` | radius [M/I] |
| `--r-pill` | `999px` | radius [M/I] |
| `--disk-sm` | `32px` | dimensions [M/O] |
| `--disk-md` | `40px` | dimensions [M/O] |
| `--disk-lg` | `48px` | dimensions [M/O] |
| `--icon-sm` | `16px` | dimensions [M/O] |
| `--icon-md` | `20px` | dimensions [M/O] |
| `--icon-lg` | `24px` | dimensions [M/O] |
| `--icon-stroke` | `1.6` | dimensions [M/O] |
| `--ctl-sm` | `32px` | dimensions [M/O] |
| `--ctl-md` | `40px` | dimensions [M/O] |
| `--ctl-lg` | `48px` | dimensions [M/O] |
| `--utility` | `44px` | dimensions [M/O] |
| `--utility-overlap` | `-4px` | dimensions [M/O] |
| `--dock-h` | `72px` | dimensions [M/O] |
| `--dock-action` | `56px` | dimensions [M/O] |
| `--dock-shoulder` | `24px` | dimensions [M/O] |
| `--assist-close` | `48px` | dimensions [M/O] |
| `--hex` | `24px` | dimensions [M/O] |
| `--edit-badge` | `36px` | dimensions [M/O] |
| `--track-h` | `10px` | dimensions [M/O] |
| `--track-h-lg` | `14px` | dimensions [M/O] |
| `--track-h-sm` | `6px` | dimensions [M/O] |
| `--table-row` | `72px` | dimensions [M/O] |
| `--table-head` | `44px` | dimensions [M/O] |
| `--nav-row` | `40px` | dimensions [M/O] |
| `--date-col` | `44px` | dimensions [M/O] |
| `--hit-min` | `44px` | dimensions [M/O] |
| `--bw-hair` | `1px` | borders [I] |
| `--bw-featured` | `1.5px` | borders [I] |
| `--bw-dash` | `1px dashed var(--v-text-2)` | borders [I] |
| `--shadow-none` | `none` | elevation — app surfaces are flat; only floating layers get a shadow [I] |
| `--shadow-float` | `0 12px 32px -12px rgba(17,17,17,.18)` | elevation — app surfaces are flat; only floating layers get a shadow [I] |
| `--shadow-lift` | `0 1px 0 rgba(17,17,17,.06)` | elevation — app surfaces are flat; only floating layers get a shadow [I] |
| `--z-base` | `0` | z [I] |
| `--z-sticky` | `10` | z [I] |
| `--z-dock` | `20` | z [I] |
| `--z-sheet` | `30` | z [I] |
| `--z-assist` | `35` | z [I] |
| `--z-dialog` | `40` | z [I] |
| `--z-toast` | `50` | z [I] |
| `--z-tooltip` | `60` | z [I] |
| `--t-micro` | `120ms` | motion [I] — decision: alive but unobtrusive |
| `--t-element` | `200ms` | motion [I] — decision: alive but unobtrusive |
| `--t-max` | `300ms` | motion [I] — decision: alive but unobtrusive |
| `--t-draw` | `600ms` | motion [I] — decision: alive but unobtrusive |
| `--t-count` | `700ms` | motion [I] — decision: alive but unobtrusive |
| `--breath` | `6s` | motion [I] — decision: alive but unobtrusive |
| `--enter` | `cubic-bezier(.2,.8,.2,1)` | motion [I] — decision: alive but unobtrusive |
| `--exit` | `cubic-bezier(.4,0,1,1)` | motion [I] — decision: alive but unobtrusive |

## Dark mode (extension)
Overrides surfaces, text and border only; accents unchanged; no source evidence.

## Fonts
`--font-display` Bricolage Grotesque (self-hosted, OFL) · `--font-text` DM Sans (OFL). The reference used Acorn and TT Commons; neither is licensed here — prepend a licensed family to the two stacks to upgrade.
