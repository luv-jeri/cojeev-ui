# PATTERNS.md — page layouts, shells and product surfaces

## Six destinations, four globals
Destinations: **Work** (home) · **Automations** · **Memory** · **Library** (skills + hooks) · **AI Apps** · **Settings/System**. Global affordances, never destinations: **Ask SahaJiv** (dock button / topbar pill), **Needs You** (count in the rail, read-only inbox), **Quick Note**, **notifications** (bell). Under 720 px the dock carries Work · Automations · [Ask SahaJiv] · Memory · More, and More reaches Library, AI Apps, Settings plus the globals — see `fixtures/specimens.html`.


Layouts are built from the shell classes in `css/patterns.css`; every page is one of six families. Container queries on `.v-shell` drive reflow, so a fixture at 1200 and a resizable window behave alike.

## Shell
```html
<div class="v-shell">
  <aside class="v-sidebar">… .v-brand + .v-collapse · .v-nav (General / Tools) · .v-sidebar__foot (Stop all) …</aside>
  <div class="v-page">
    <header class="v-topbar">.v-search (pink disk + cream field + scope chips) … .v-utility (3 joined circles)</header>
    <div class="v-main"><div class="v-content">…</div><aside class="v-rail">…</aside></div>
  </div>
</div>
```
Rail 360 · gap 40 · ≤1180 rail stacks under content · ≤900 icon sidebar 76 · ≤720 sidebar hidden, `.v-dock` fixed bottom with Work · Automations · [Ask SahaJiv] · Memory · More (More opens `.v-dockpanel` listing Library, AI Apps, Settings, and the globals Needs You and Quick Note).

## Six page families
1. **Dashboard + agenda rail** (I15): `.v-pagehead` → 2×2 tinted metric cards → `.v-md` connected master/detail; rail = `.v-cal` + actions + `.v-agenda`. Used by Work · Now.
2. **Profile / record workspace** (I11 I16): left column `.v-profile` `.v-band` `.v-kv.-panel` alerts; right column title + `.v-tabs.-underline` + `.v-prow` rows + charts + documents. Used by Agent detail, Run detail, Memory entry.
3. **Content hub + resource rail** (I17): `.v-feature` → date-grouped `.v-card` grid with `.v-attached` circles; rail of `.v-resource` and `.v-attach`. Used by Explainers, Library.
4. **Table** (I18): ring + stacked `.v-mcard`s left; pending items, `.v-tabs.-pills` filters, `.v-table-wrap` + `.v-pager` right. Used by Runs, AI Apps matrix, Free Models.
5. **Weekly grid** (I18): toolbar (Add, range select, Today/Week/Month) + `.v-week`. Used by Automations schedule. Under 900 show `.v-agenda` instead.
6. **Mobile single column** (I07 I09 I11): `.v-mobile` with `.v-mobile__head`, one hero or ring, action row, sections; `.v-dock` at the bottom.

## Global surfaces
- **Ask SahaJiv**: `.v-assist.-mini` (pill in the topbar/rail) → `.v-assist.-anchored` (bottom-right, 470 × ≤ 760) → full sheet on mobile via `.v-drawer`. Close circle pulses once when a reply arrives.
- **Needs You**: `.v-nav__count` in the rail; inbox = list of `.v-needs` rows, each with exactly one action "Open in <host>". No reply control anywhere.
- **Quick Note**: `.v-textarea` + destination `.v-badge` + Change + Save → durable cream toast with Open.
- **Notifications**: bell in `.v-utility` with pink dot → `.v-sheet` of events (read/unread) and receipts.
- **Help**: `?` in the topbar opens a `.v-sheet` with per-page hint / how / worth.

## Five states on every data surface
Use `.v-state.-loading|-empty|-filtered|-partial|-stale|-unavail|-error`. Copy rules: name what is missing, say what was not changed, offer one action. Pending receipts use `.v-receipt__dot.-pending` and never the olive dot.

## Legacy class map (ui_kits/sahajiv → SahaJiv Design System)
`.agh` → `.v-pagehead` · `.ws` → `.v-shell` · `.dwr` → `.v-sheet` · `.kv` → `.v-kv` · `.tile` → `.v-card.-<accent>` · `.pill` → `.v-badge` · `.lens` → `.v-tabs.-lenses .v-tab` · `.notice` → `.v-alert.-<kind>` · `.health` → `.v-health.-<state>` · `.node` → `.v-node` · `.wire` → `path.v-wire` · `.dock` → `.v-dock` · `.ask` → `.v-assist`. Old tokens keep resolving through `css/legacy-aliases.css` until each page migrates.
