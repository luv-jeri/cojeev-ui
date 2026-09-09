# Production refinements

The original 66 components remain the foundation. The September 2026 refinement brief explicitly authorizes improving broken or excessive source behavior while preserving Cojeev's visual family: warm canvas, expressive silhouettes, black structure, pink/olive/blue/yellow accents, Bricolage Grotesque headings and DM Sans body text. Historical source-comparison results remain in BASELINE-STATUS.md and the original gate reports; they are not claims of final production acceptance.

## Implemented

- **Selection motion:** Glide now follows a calm, monotonic 240 ms path. Tabs no longer stack content entry and landing effects. Segment labels and bodies stay still; rapid changes settle on the most recent selection. All nine expressive presets remain selectable, with persistent speed and intensity controls.
- **Checkbox:** Preserve the checked and indeterminate glyphs in dark mode. Final dark surface rules change the background color without clearing the authored SVG image.
- **Stillness:** Reduced motion and global Off preserve readable content, authored fills and selected state. Off removes native press translation as well as generated body motion.
- **Documentation:** One configurable example per page, exact variant/size code, visible motion controls, grouped catalog, individual usage/accessibility notes and related components. Fumadocs provides the documentation base; Cojeev supplies its visible controls and surfaces.
- **Examples:** Button includes local loading, failure and retry. IconButton exposes its six existing treatments and four sizes with a working toggle action. Example code describes actual local effects.

- **Final visual corrections:** Readable secondary text on pastel/ink Cards and Bubble timestamps; contrasting Alert glyphs, navigation counts and collapse controls; selected ButtonGroup state stays distinct in dark mode. Default Tabs now have padded targets, including 48 px height for coarse pointers. Popovers sit above ordinary content and dialogs.
- **Effects edge cases:** AnimatedNumber preserves caller refs and displays an em dash for unavailable values. Zero-duration TextReveal shows its entire text immediately.
- **Mobile geometry:** Generated Morph SVGs are positioned before insertion, preventing their default size from inflating a control during measurement. Sheet columns and MotionControls can shrink and wrap within narrow screens.
- **Touch sculpture:** Hover tilt requires a hover-capable input. Safari's compatibility mouse events after touch no longer start an unwanted tilt animation after Pause; real mouse interaction remains independent of idle animation.
- **Fresh installation:** Foundation metadata merges Cojeev's semantic color aliases after the initialized app's starter theme and registers the documented data-mode dark variant. Components retain their warm surfaces and readable dark text when installed directly by URL into an existing shadcn scaffold. Body and display fonts use the bundled DM Sans and Bricolage faces; explicit host font utilities remain the app's choice.

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

## Signature overhaul — 0.2.0

The registry now includes 89 UI entries: the original 66 and 23 additional entries. This update adds ThemeToggle, AnimatedIcon, Presence, AgentState, AgentChat, AreaChart, BarChart, LineChart, PieChart, RadarChart, RadialChart and ChartTooltip. Existing Shape gains 12 original fixed-topology silhouettes and ShapeMorph, bringing its catalogue to 36. The supplied raster moodboards remain inspiration; their watermarked images are not distributed as library assets.

Shared Motion lanes now drive selection travel, disclosure and popup paint, theme crossfades, organic scrolling, contextual iconography and keyed content changes. Native Radix/cmdk/DayPicker contracts remain responsible for accessible interaction. Compound agent and chart surfaces reuse the library's existing atoms. The refreshed documentation uses the same installable Preview, ScrollArea, buttons, inputs and theme controls.

Dark foregrounds, anchored overlay origins, popup stacking, long-word wrapping, hidden-control geometry and Safari popup anchoring received concrete corrections. [OVERHAUL-COMPONENTS.md](OVERHAUL-COMPONENTS.md) lists all 68 entries in the overhaul brief; [OVERHAUL-LIFECYCLE.md](OVERHAUL-LIFECYCLE.md) explains the actual retained boundaries and native-filtering limit.

## Verification

The production gate checks the real documentation and component behavior. The historical source fidelity tools remain available as an audit; intentional improvements do not need to recreate confirmed source defects. A release also requires a successful build, fresh consumer installation, public registry URLs and passing deployment checks. A local implementation checkpoint is not a publication receipt.


## Living showcase and control refinement

The registry adds ItemAdornment for deterministic automatic shapes, selected shape/colour, custom icons and no adornment. It now has 90 UI entries: 66 original components and 24 additional entries. DropdownMenu, Menubar, ContextMenu, Select, Command, Combobox, MultiSelect and NavigationMenu share this API. The icon pack contains 136 names; AnimatedIcon adds configurable effects and StateChevron follows native disclosure state.

Checkbox, RadioGroup and Questionnaire use a gently organic near-circle by default, with cursor-responsive contour motion. Circle, rounded, pebble, leaf and flower remain selectable. Secondary/disabled/loading Button paint, Calendar/DatePicker composition and Dropzone presentation were refined. The default Button demonstration retains its success/error/retry flow.

ThemeToggle reveals the actual destination page through a slower organic contour with varied viewport origins. Consumers can specify an explicit origin. Native scrollbars respond to direction, velocity, hover and held dragging. Quiet settings settle the page immediately.

The home route tells the library's story through a real 3D scene, native-scroll assembly, interactive conversation and shape playground, principles and installation. The Work with Me route links to the creator's confirmed GitHub profile. Both pages compose the library's own primitives. See [REFINEMENT-REPORT.md](REFINEMENT-REPORT.md) for final evidence and limits.
