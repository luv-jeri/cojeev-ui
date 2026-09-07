# Sheet / HoverCard health-line scope classification

This is a classification of the unchanged full-scene evidence, not acceptance of either whole scene. Existing scene captures come from artifacts/interactive-partition-c/results.json on bda75de. Production source files and the original handoff were not edited during classification. Later owned popup-default fixes are tracked separately.

## Exact scope authority

- data/registry.json3319–3322 and data/port-map.json3099–3102 identify health-line / Agent Card + Health Line as tier `sahajiv`. entries/health-line/contract.md3 repeats tier `sahajiv`; its API at5 explicitly owns `.v-health` plus `.v-word`, `.v-age`, `.v-next`, and status icon context. This is a product surface, not a base component. Earlier notes called it a composite because its CSS is in composites.css; that filename is not the tier authority.
- HANDOFF.md223/D11 states the66 base components are in scope and excludes composites/product surfaces. AGENT-BRIEF.md28–30 likewise includes66 base entries and excludes17 composites plus19 product surfaces. These planning files are in /Users/sanjaykumar/Claude/Projects/sahajiv/docs/research/2026-09-07-vriksha-registry/.
- HoverCard and Sheet are both tier `base` in their registry entries and contracts. Their containing base components remain in scope even when a supplied demo embeds excluded content. The exclusion does not excuse defects in their wrappers, positioning, or other base children.

## Which child owns each difference

| Source subtree / sampled identity | Ownership | Evidence and consequence |
|---|---|---|
| `.v-health` / `gate:health-line/ok` or `/you` | Excluded product root | composites.css59/85 supplies flex wrap, typography14px and gap6px12px. The candidate intentionally has no product CSS, giving15px and a two-line41.75px row instead of20.2969px. |
| `.v-health .v-word` / `gate:hover-card/v-word` or `gate:sheet/v-word` | Product subpart, despite the parent-family gate label | The health contract API and composites.css59 own600 weight, inherited14px type, and flex-item sizing. It is not an independent base component. |
| `.v-health .v-age` / `gate:hover-card/v-age` or `gate:sheet/v-age` | Product subpart | composites.css59 owns12px muted age text and min-width0. Its type, color, border-currentColor and outline-currentColor deltas derive from that excluded context. |
| `.v-health > .v-icon` | Shared Icon glyph is base; health-status color context is product | The existing Icon remains rendered. `.v-health.-ok/-you .v-icon` olive/pink color comes from composites.css59 and belongs to the excluded product state. No private product styling should be copied into Icon. |
| HoverCard identity header: `.v-disk`, glyph, `.v-meta`, name | In-scope base/structural children | They are outside `.v-health`; none may be dropped by a scope adapter. Existing sampled base header styles have no deltas. |
| Sheet title/header/description/buttons | In scope | Existing sampled layout/type matches. Close border and close/action transition differences are the separately documented hidden-descendant source initialization conflict, not health-line ownership. |

## Exact minimal existing measured differences

For the360px light and dark open scenes, each has18 direct health subtree style differences:4 on the product root,7 on `.v-word`,7 on `.v-age`. Their causes are the missing excluded product rule, not18 independent base defects.

HoverCard has20 differences total. Besides those18, its content height is125.234px source versus146.688px candidate: the21.454px increase matches the product row increase41.75−20.2969=21.4531px. This is a derived container-size difference and must stay recorded. The final difference is an independent visible source `.v-hovercard` wrapper identity missing from the candidate gate mapping. That is an owned mapping defect, not excluded content.

Sheet has21 differences total:18 product subtree differences plus the close icon border and two control transition timing deltas from source morph.js326 calling unavailable window.VAlive when hidden descendants open. There is no additional sampled Sheet content width/height/padding/gap/type delta in this receipt. Its later children move down because the substituted unstyled product row is taller; pixels therefore cannot prove the whole base container scene exact.

## Independent owned HoverCard defects found by source inspection

- ui.js180 puts the card below the trigger with8px spacing and aligns left to the trigger, clamped8px from the right viewport edge. Public HoverCardContent previously used6px and inherited Radix center alignment. This is independent of child content.
- ui.js180 hides after150ms. Public HoverCard previously used100ms. The public300ms opening delay already matched.
- fixture-interactive.tsx mapped visible content into the real portal but left the original wrapper as an empty hidden placeholder. Source data-gate identity must identify the real Radix positioning wrapper when open. Correcting this must preserve its real transform/positioning, not synthesize reference CSS.
- The three popup body max-width/max-height/overflow rules were not in source components.css164. DatePicker demonstrates a concrete width loss at360: source340px, candidate336px. DatePicker authored isolation line6 uses top+8; its public content had inherited6. Popover source components-2.css26 uses top+6,left0. These exact owned default corrections are separately authorized.

A minimal scope comparison could replace only the `.v-health` subtree on BOTH sides with identical already-published base children, while preserving the original full-scene failing receipt and every outer wrapper/header/content node. This report does not implement that adapter, accept the full scenes, invent a product component, or mask any visible region.
