# Semantic Bloom source capture

SOURCE: https://threeui.com/text-animation/semantic-bloom
Upstream: MengTo/threeui at 68802d5428071ada5c20db8094b1649e6bb770ed (MIT). Original HTML SHA-256: 0e48ec9ed2c33f81e7c1a9123ea191256106765624dfc9adf227b44ae001f989, matching the live Code tab hash prefix.

Target: preview iframe titled Semantic Bloom: Codex; canvas#bio-layer, DOM .journal-area .word and SVG #liquid-filter. Canvas 2D + DOM, one canvas with SVG blur/alpha threshold/turbulence/displacement/composite filter; zero external assets. Source shown by the live documentation binds the HTML and React focus adapter to this surface.

The baseline retains the upstream focus adapter and source byte content; a startup control message selects Codex. Random paths are nondeterministic. Native adaptation will retain the force constants and compositing order while integrating design tokens, local coordinates, bounded fixed timesteps and lifecycle cleanup. These are explicit native changes, not a pixel-identical replay claim.
