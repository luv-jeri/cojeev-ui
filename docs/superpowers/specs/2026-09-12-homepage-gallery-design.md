# Approved homepage: a small living collection

Owner approval: 12 September 2026. Sanjay selected A's olive footer, B's browsing section and C's profile-card stage, approved the combined mockup, and explicitly asked to build and deploy after checks while he is away. This records that approval rather than adding another approval round. The latest requirement replaces the mockup's flat background with existing animated backgrounds, without crowding the page.

## Job and hierarchy

Help a visitor understand the library, try an expressive working component, discover a few useful details and contact the maker. One short page: introduction and profile stage, curated gallery, contact footer. Canonical seed wordmark, current typefaces and semantic light/dark tokens stay intact. No invented testimonials, popularity claims, sparkle clouds or physical-cabinet metaphors.

Use the combined mockup in `.impeccable/mocks/2026-09-12-homepage/combined-direction.png` as a composition reference, not a bitmap to ship or an exact source of copy/icons. Reduce the main card's extra text. Keep the display heading around the current 72px role, with fluid smaller-screen scaling; generous 24–48px section interiors and 48–80px section separation. No nested configuration panels.

## Working profile stage

Three visibly different treatments, labelled Classic, Fold and Stack. Classic is the spacious profile with avatar, identity, short description and Follow/Message; Fold is a narrow bookmark-like identity surface with Save; Stack is a layered profile file with a short secondary detail. These are local demo compositions of existing library primitives, not three recolours and not breaking changes to ProfileCard's public API. Keep one dominant active specimen and small quiet previews of the other treatments. On mobile show the active specimen and labelled selector without squeezing three cards across the viewport.

Assembly lives here. A finite entrance and Replay assembly sequence settles surface, avatar, identity and actions. At most one specimen assembles at a time. Replaying retains user state and native controls. Use shared choreography and presence/visibility contracts, no sparkle particles and no perpetual assembly loop. Labels and hit areas do not chase the pointer. Interaction during rapid replay or selection must settle to the latest intent; quiet modes show the complete usable card immediately. All demo actions are labelled local and must not imply a message was sent to a real person.

## Background and browse

Use existing PigmentField behind the stage at restrained intensity and speed, with semantic foregrounds, static fallback and the shared quiet/visibility lifecycle. Do not combine several active background engines in the same viewport or add an outside shader dependency. A low-frequency depth/contour treatment may support the footer only if it stays subordinate; the reading/gallery ground remains calm. No inferred licence permission from other libraries' live demos.

The browse shelf offers real Rubber Slider, MotionDrawer, Bento Grid and Command specimens, with short names/descriptions and routes to documentation. Add modest Featured/Motion/Layout filters only if each has useful real content, no dead or identical tabs. Bound interactive previews, preserve data across cosmetic changes, keep outer navigation separate from inner controls. No per-tile installation toolbars. The user can reach all components through one clear link.

## Footer and shared surfaces

An olive contact close with one shallow continuous wave, heading “Like how this feels?”, one short invitation, Work with me and GitHub. Retain privacy, licence and motion access as a quiet utility row. Use existing contact configuration: never bypass the verified-email feature gate. Homepage-specific header layout must not unintentionally restyle other marketing routes or remove beta identity added by release Task 3.

## Acceptance

Desktop 1440px, mobile 390px and 320px; light and dark screenshots inspected, with no horizontal page overflow, clipped focus or overlapping text. Test labelled variant selection by pointer and keyboard, meaningful Follow/Save/Message local feedback, rapid Replay/switch, quiet Motion Off/Flow Off/system reduced motion, offscreen/hidden background suspension and state retention. Verify gallery controls and doc links, footer links, no console errors and no private analytics payloads. Existing installation/library gates remain required. Mockup approval is design approval, not runtime certification. Production includes only reviewed committed code after beta and release gates; no registry submission or marketing messages are authorized by this spec.
