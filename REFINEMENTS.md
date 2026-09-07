# Production refinements

The original 66 components remain the foundation. The September 2026 refinement brief explicitly authorizes improving broken or excessive source behavior while preserving SahaJiv's visual family: warm canvas, expressive silhouettes, black structure, pink/olive/blue/yellow accents, Bricolage Grotesque headings and DM Sans body text. Historical source-comparison results remain in BASELINE-STATUS.md and the original gate reports; they are not claims of final production acceptance.

## Implemented

- **Selection motion:** Glide now follows a calm, monotonic 240 ms path. Tabs no longer stack content entry and landing effects. Segment labels and bodies stay still; rapid changes settle on the most recent selection. All nine expressive presets remain selectable, with persistent speed and intensity controls.
- **Checkbox:** Preserve the checked and indeterminate glyphs in dark mode. Final dark surface rules change the background color without clearing the authored SVG image.
- **Stillness:** Reduced motion and global Off preserve readable content, authored fills and selected state. Off removes native press translation as well as generated body motion.
- **Documentation:** One configurable example per page, exact variant/size code, visible motion controls, grouped catalog, individual usage/accessibility notes and related components. Fumadocs provides the documentation base; SahaJiv supplies its visible controls and surfaces.
- **Examples:** Button includes local loading, failure and retry. IconButton exposes its six existing treatments and four sizes with a working toggle action. Example code describes actual local effects.

- **Final visual corrections:** Readable secondary text on pastel/ink Cards and Bubble timestamps; contrasting Alert glyphs, navigation counts and collapse controls; selected ButtonGroup state stays distinct in dark mode. Default Tabs now have padded targets, including 48 px height for coarse pointers. Popovers sit above ordinary content and dialogs.
- **Effects edge cases:** AnimatedNumber preserves caller refs and displays an em dash for unavailable values. Zero-duration TextReveal shows its entire text immediately.

## Additional components

| Entry | Category | Purpose |
| --- | --- | --- |
| Component preview | Tools | Reusable preview/code tabs for the docs |
| Motion Adjuster | Tools | Shared motion authoring and compact nine-preset controls |
| Icon and icon button | Actions | Existing icon primitives made discoverable |
| Shape | Layout | Shared authored silhouette primitive |
| Code block | Tools | Exact-text copy, accessible feedback, optional wrapping and HTTP selection fallback |
| Animated number | Effects | Interruptible metrics with stable final values under reduced motion |
| Text reveal | Effects | Bounded rise/fade word entrance with the full text accessible once |
| Ambient background | Backgrounds | Three quiet compositions using the shared shapes and palette |
| Shape scene | 3D | Tactile extruded shapes, bounded pointer response and static fallback |
| Marquee | Creative | Repeating content with explicit pause, inert visual copies and static keyboard reading |
| Multi-select | Forms | Searchable multiple choices, removable tokens and native form values |

Every addition uses the shared design language. Heavy 3D code is restricted to its optional registry entry.

## Verification

The production gate checks the real documentation and component behavior. The historical source fidelity tools remain available as an audit; intentional improvements do not need to recreate confirmed source defects. A release also requires a successful build, fresh consumer installation, public registry URLs and passing deployment checks. A local implementation checkpoint is not a publication receipt.
