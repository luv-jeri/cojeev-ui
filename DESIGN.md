---
name: "Cojeev UI"
description: "Warm paper, precise ink, and living contours for agent interfaces."
colors:
  pink: "#F5B8DB"
  olive: "#9AAB63"
  blue: "#B6CAEB"
  yellow: "#F5D867"
  paper: "#FBF4E6"
  beige: "#EEE7DA"
  beige-raised: "#F3ECDF"
  ink: "#111111"
  text: "#0E0B0B"
  text-secondary: "#5F5B55"
  dark-canvas: "#171512"
  dark-beige: "#221F1B"
  dark-raised: "#2A2621"
  dark-text: "#F6EFE2"
  dark-text-secondary: "#B5AC9E"
  border: "#D9D2C4"
  control-edge: "#87806F"
  dark-border: "#3A352E"
  focus-mulberry: "#9C3E6E"
  danger-fill: "#C9332D"
  danger-ink: "#A8302B"
typography:
  hero:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-.03em"
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-.015em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-.01em"
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  reading:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
  meta:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  card-sm: "16px"
  card: "20px"
  panel: "24px"
  sheet: "28px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "20px"
  s-6: "24px"
  s-8: "32px"
  s-12: "48px"
components:
  button-default:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-accent:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.beige}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger-fill}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "40px"
  input:
    backgroundColor: "{colors.beige}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "48px"
    width: "100%"
  navigation:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0 12px 0 20px"
    height: "40px"
  badge-pink:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 11px"
    height: "26px"
  card:
    backgroundColor: "{colors.beige}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "24px"
---

# Design System: Cojeev UI

## Overview

**Creative North Star: "Warm paper, precise ink, living contours"**

Cojeev pairs warm paper surfaces and precise ink typography with soft pink, olive, blue and yellow accents. Organic contours give controls and agent states a recognizable character while clear text, deliberate spacing and explicit state feedback keep monitoring and decisions legible. This continues the established Intelly and Cojeev handoff direction while allowing the component system to evolve.

The interface has two complementary modes: calm reading surfaces for documentation and tactile operating surfaces for actions. Motion for React provides shared springs, selection travel and reusable presence; bespoke SVG geometry supplies fluid edges and expressive fields. Chromatic gradients, masks and restrained spatial depth are part of this vocabulary where the component implements them.

This is a record of the implemented reusable system. The frontmatter records light defaults and explicitly named dark primitives; the runtime CSS variables remain the live source for mode changes. The [sidecar](.impeccable/design.json) holds motion, elevation, responsive metadata and self-contained visual samples. It is not a completion claim for every requested motion lifecycle or every possible consumer composition. No approved-comp, FORM seed or QUALITY BAR provenance is asserted here.

**Key Characteristics:**

- Warm neutral surfaces with paired, theme-aware foregrounds.
- Bricolage Grotesque headings with DM Sans reading and controls.
- A shared 4px spacing rhythm with bounded, content-driven compositions.
- Pills, rounded containers and authored organic silhouettes.
- Native interaction semantics beneath expressive motion.

## Colors

Soft identity hues sit against warm neutrals, with deliberate dark equivalents rather than a uniform inversion. The normative values above come from [color and semantic tokens](registry/cojeev/styles/tokens.css); [theme aliases](registry/cojeev/styles/theme.css) expose them to the component styles.

### Primary

- **Pink** is the principal interaction accent: selected controls, active navigation, agent highlights and accent buttons. The default Button also becomes pink in dark mode.
- **Focus mulberry** supplies the base focus ring. Some dark fields use pink focus edges for their specific surface.

### Secondary

- **Olive** marks constructive status and memory-related regions.
- **Blue** marks informational and work-related regions.
- **Yellow** carries progress, attention and automation-related regions.

### Tertiary

- **Danger fill and danger ink** are separate roles for destructive controls and readable status text. Use the existing paired status background/ink tokens for messages rather than reusing a vivid fill as small text.

### Neutral

- **Paper, beige and raised beige** separate page, container and nested surfaces in the light theme.
- **Dark canvas, dark beige and dark raised** retain the warm hue family while reversing reading contrast.
- **Text and secondary text** follow the surface theme; fixed ink remains the foreground on solid accent fills.
- **Border and control edge** have different source roles: quiet surface division versus visible control boundaries. Individual components define their actual edge and focus treatment.

**The Paired Surface Rule.** Choose foreground and surface together. Accent fills retain fixed dark ink; theme-aware neutral surfaces use their matching text roles.

**The Readable Paint Rule.** Decorative paint above content stays translucent or clear of the text. Selection, hover and disabled state must remain distinguishable without obscuring labels.

Dark soft badges use deep component tints with pale foregrounds; their visual treatment is not the same as a solid accent badge. The sidecar's eight-step tonal strips are generated swatch previews, not additional shipped CSS tokens or approved replacement colors.

## Typography

**Display Font:** Bricolage Grotesque with system sans-serif fallbacks.

**Body Font:** DM Sans with system sans-serif fallbacks.

**Code Font:** the existing platform monospace stack for code, identifiers and terminal-like text.

The display face gives headings a human, sculptural edge; the body face keeps controls and dense information direct. The ramp is role-based rather than a fixed mathematical ratio. [Typography primitives](registry/cojeev/ui/typography.tsx), [responsive type rules](registry/cojeev/styles/typography.css) and [base typography](registry/cojeev/styles/base.css) define the applied roles.

### Hierarchy

- **Hero / Display:** use the frontmatter roles for large product statements and expressive numeric artifacts. At the component small-screen breakpoint, Hero becomes 3rem and Display 2.25rem.
- **Headline:** the display family marks section starts with compact leading.
- **Title:** compact component titles use the reading family; the Title primitive is 20px with 1.25 leading, while CardTitle is 16px with 1.2 leading. These are component contracts, not a replacement global scale.
- **Body / Reading:** base application text and the Body primitive are recorded separately because their size and leading differ in source. Prose paragraphs and list items use more open 1.65 leading and a bounded reading measure.
- **Label / Meta:** controls and supporting information stay subordinate to headings. Numeric values and identifiers use tabular figures where alignment matters.

**The Reading First Rule.** Headings establish hierarchy; animation never becomes the only way to expose essential reading content.

## Layout

The shared spacing tokens follow a 4px grid. Reused gaps and padding are recorded above; the source also contains component-specific dimensions that should remain local. Most controls use the shared small/default/large heights (32/40/48px), while Input defaults to 48px and has its own 40px small size. Long-form, permission and task controls use explicit minimums with content-driven heights.

Reading surfaces use a quiet index, a clear heading and description, a generous specimen, then installation and usage guidance. In the [documentation layout](app/docs/docs.css), the main region is bounded at 1280px and the article at 920px; prose uses roughly 70–72ch. A 232px index rail becomes mobile navigation at 900px, and a local contents column appears from 1280px. Specimen controls remain adjacent to their example and wrap on small screens.

The [agent layout](registry/cojeev/styles/agent-chat.css) has a flexible main workspace and a 320–420px chat column, stacking at 900px. A standalone chat specimen is bounded at 520px; that cap is removed inside the side-chat layout. These are established compositions, not universal page templates.

**Boundaries:** use `min-width: 0`, intrinsic widths, deliberate maximums and flexible text wrapping in nested rows. Tables and message threads retain their own scrollable regions. Overlay content uses viewport-aware limits and portals where implemented so its geometry is not constrained by the trigger's card.

## Elevation & Depth

The base surface vocabulary is tonal: containers read through changes in warm fill, radius, spacing and restrained edges. Floating layers add a soft shadow. The implemented lift Card adds pointer-responsive tilt, separated content planes and a soft light field; this is an explicit opt-in variant. The prior flat-surface direction therefore remains the default, with authored depth as a named extension rather than a blanket ban on shadows, gradients or glass-like effects.

### Shadow Vocabulary

- **Float:** the shared floating-layer shadow; it darkens for the dark theme.
- **Lift:** the shallow edge shadow used by lift surfaces.
- **None:** the base elevation value for ordinary surfaces.

Exact values and the ordered sticky/dock/sheet/dialog/popover/toast/tooltip levels are recorded in the sidecar and originate in [tokens.css](registry/cojeev/styles/tokens.css). Component overlays may add nested portal levels; they must be assessed in their real host rather than by a single number.

**The Owned Depth Rule.** Depth belongs to the component that implements it. Keep its foreground, watermark and pointer light on distinct planes; avoid two motion owners writing the same transform.

## Shapes

Pill controls, small rounded affordances and broader card/panel/sheet corners establish the reusable form language. The recorded radius scale maps to the existing CSS tokens. Explicit variant geometry remains meaningful: square Avatar uses a rounded square, while default Avatar is circular.

[Shared mathematical silhouettes](registry/cojeev/lib/signature-shapes.ts) include daisy, petal, aster, sunburst, clover, cloud, pebble, ribbon, scalloped square, cushion and seed-wing families. [Shape](registry/cojeev/ui/shape.tsx) and the existing masks make these reusable across components. Card watermarks stay behind content; agent fields combine several paths and chromatic layers. These implemented motifs provide vocabulary without proving that every catalog entry already has a unique signature.

The fluid scrollbar preserves a real scroll viewport and keyboard/touch interaction while shaping the visible thumb edge. The decorative contour does not replace the scroll semantics.

## Components

The [registry source](registry/cojeev/ui) owns the reusable contracts. Frontmatter component tokens are compact light-theme samples; the sidecar resolves the actual CSS roles for interactive previews. Its snippets show geometry, color and CSS states without reproducing the React motion runtime.

### Buttons

Tactile pill controls combine consistent label alignment with press and contour response. The default, accent, secondary, ghost, outline and danger variants have distinct surface roles. Small and large change the shared control height and horizontal spacing; block/fullWidth is a layout modifier. Busy controls retain their label, expose busy state and reject activation. Disabled styling uses its own face, ink and edge rather than whole-control opacity. Focus remains visible.

### Chips

Badges provide compact status, count and category labels. Solid pink uses fixed dark ink; semantic status variants use paired status colors. Soft variants use tinted surfaces, including explicit dark treatment. Default/small/large and the special count/caps dimensions remain component contracts. Static badges do not acquire button semantics merely because they have a pill shape.

### Cards / Containers

Cards use the shared card radius and padding, with a smaller density option, broader panel variant, accented fills and a featured edge. Watermarks are decorative and remain behind the content. Nested descriptions choose the card's own secondary foreground, including on dark and colored surfaces. Lift behavior is opt-in; an ordinary Card is not an interactive control by default.

### Inputs / Fields

Fields use rounded containers, deliberate control edges and tinted focus states. Labels, descriptions and error messages remain associated with native controls. Error and disabled states retain readable text. InputGroup supplies shared composition for affixes and multiline controls; the agent composer uses its Textarea-based multiline primitive and shared input tokens, plus the Input primitive for file selection.

### Navigation and overlays

The product sidebar is an ink structural region with warm foregrounds and pink active accents; the docs composition deliberately applies a quieter paper rail. Active selection travel, press response and focus states use shared motion where integrated. Mobile navigation changes composition rather than shrinking every row.

Menus, dialogs, sheets and popovers pair their own surfaces and foregrounds, preserve dismissal and focus semantics, and bound long content. [Presence](registry/cojeev/ui/presence.tsx) offers fade, rise, slide, scale and mask presets. A persistent MotionPresence boundary must own keyed conditional children for their exits to be retained; MotionSurface alone cannot retain its own removal. Its retained exits are inert and hidden from assistive navigation. Existing integrations are evidence of those patterns, not a claim of universal adoption across every nested element.

### Agent patterns and data

[AgentChat](registry/cojeev/ui/agent-chat.tsx) composes Bubble, Avatar, Message, MessageScroller, Input/InputGroup, Button, Attachment and Questionnaire. It exposes controlled send, stop, attachment, permission, choice and retry contracts. The example workflow labels itself as an interactive demo and implements allow, deny, cancellation and error/retry as local state transitions. [AgentState](registry/cojeev/ui/agent-state.tsx) pairs named statuses with an expressive SVG field; the visual does not imply a connected backend.

The chart suite shares frame, legend, table and tooltip composition across Area, Bar, Line, Pie, Radar and Radial implementations. Series reuse the brand palette, while labels, active points and data readouts keep meaning available beyond color. Chart variants remain type-specific; data geometry is not a decorative shape token.

### Motion, icons and theme

[Choreography](registry/cojeev/motion/choreography.ts) supplies responsive, expressive and gentle springs, entrance/exit easing, short durations and sibling stagger. [AnimatedIcon](registry/cojeev/ui/animated-icon.tsx) exposes draw, tremor, spin, bounce and validation intent; [ThemeToggle](registry/cojeev/ui/theme-toggle.tsx) composes Button with sun/moon motion and the theme transition helper. Bespoke contour geometry coexists with Motion through separate property ownership.

The shared quiet contract resolves system reduced motion, Motion Off and Flow Off to immediate, meaningful states. Visibility hooks suspend participating offscreen or hidden effects. Apply these contracts to each real interaction boundary and verify it; the existence of the shared helper does not certify every component's complete lifecycle.

## Do's and Don'ts

### Do:

- **Do** pair each colored or dark surface with its explicit foreground role, including nested descriptions and icons.
- **Do** use the shared spacing, corner and focus vocabulary, with flexible text and content-driven heights for long content.
- **Do** compose agent and other compound patterns from the registry primitives and keep demo activity visibly labelled.
- **Do** place stable keys at real removal boundaries when using MotionPresence, and retain native pointer, keyboard and touch behavior.
- **Do** check the actual rendered light, dark, small-screen and quiet-motion states when adding or changing a component.

### Don't:

- **Don't** turn the documentation rail or a single workspace composition into a mandatory layout for every product surface.
- **Don't** use decorative paint, clipped containers or motion to conceal text, focus, scroll affordances or disabled state.
- **Don't** replace an explicit documented shape variant with a generic morph silhouette.
- **Don't** assume a lifecycle wrapper proves every nested interaction, or describe a local simulation as a connected agent backend.
