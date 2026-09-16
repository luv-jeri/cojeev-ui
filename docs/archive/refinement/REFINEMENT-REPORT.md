# Living showcase and component refinement

**Historical pass:** this report describes source snapshot 6c16a3b. The owner subsequently requested a new local review pass. Deployment run34219556763 was cancelled and did not deploy. Public consumer verification and release builds are on hold; see REVIEW-PASS-PLAN.md for the current work.

This refinement follows the owner's final direction: slower, varied theme reveals and subtle near-circle selectors that respond to the cursor. It also completes the requested narrative landing page, creator page, readable controls and reusable menu/icon language.

## Resulting experience

- The home page tells the library's story through real components: a shaded 3D sculpture, a scroll-driven assembly into a working local conversation, interactive shapes, agent states and installation controls. Keyboard controls and quiet-motion alternatives remain usable.
- Work with Me describes the creator's current project and uses the approved GitHub profile as its contact destination. The site shares the library Sidebar, navigation, theme controls and component primitives.
- Theme changes reveal the destination page through a smooth organic contour. Normal duration varies from 1.20 to 1.38 seconds; origins vary across nine viewport regions without immediately repeating the same region. Corners, edges and centre are included. Off, reduced motion and unsupported browsers apply the theme immediately.
- Checkbox, RadioGroup and Questionnaire default to a gently asymmetric circle. Their small selection surface uses Button's shared cursor attraction and deformation engine; labels stay stable. Stronger shapes are optional. Checked, indeterminate, disabled and keyboard semantics remain explicit.
- Secondary Buttons have a distinct blue face. Loading preserves its variant's fill and readable text, while disabled actions remain visibly quiet. Shared SVG repainting follows hover, focus and state changes.
- Calendar and DatePicker have clearer hierarchy and selected/today states. Dropzone has designed empty, drag, receipt and rejection states with real File callbacks.
- Menus have bounded widths, readable selected/highlighted states and stable varied blob adornments. Consumers can choose a shape/colour, supply a custom icon or disable decoration. Documentation variant and size controls use the library Select.
- The icon catalogue contains 136 names; general icons respond to control hover, focus and activation; animated icons and state chevrons share the library's quiet-motion rules. ScrollArea responds to native scroll direction, velocity, hover, press and thumb dragging.

The catalogue contains 90 UI entries: the original 66 and 24 additions. ItemAdornment is the new installable primitive in this refinement. The marketing layouts are compositions of library components, not additional registry entries. The registry includes 91 items when the shared foundation is counted.

## Verification

Development evidence has passed for the following bounded scopes:

| Scope | Evidence |
| --- | --- |
| Marketing | Chromium at 390, 768 and 1440px in both themes; WebKit at 360 and 768px in both themes. Local composer, shape controls, keyboard rotation, state controls, navigation and quiet composition respond. |
| Review corrections | Chromium at 360px in both themes: mobile keyboard focus and Escape return; manual assembly steps in reduced motion. |
| Controls | Chromium at 390 and 1440px in both themes: real selection/file/date callbacks, keyboard behavior, actual SVG paint and cursor deformation. Four functional and four motion contexts pass. |
| Menus | Chromium at 390px dark and 1440px light: pointer/keyboard selection, search identity, form values, custom icons, compact bounds and quiet behavior. |
| Theme and scroll | Chromium and WebKit at 390 and 1440px: random origins, actual intermediate reveal frames, final theme, glyph visibility, interruption and native scroll behavior. |
| Documentation integration | Nine changed entries: live preview, copied source, Select-backed axes and meaningful interaction checks. |
| Copied examples | All 90 default examples and 353 variant/size snippets compile without TypeScript diagnostics. |

The final normal `npm run build` generated all 97 pages and exited 0. Lint and all 33 focused tests pass. Next 16.3.4’s native shutdown stalled while writing its production filesystem cache; its documented cache opt-out resolved the stall without changing the compiler or development cache. See [build diagnosis](REFINEMENT-BUILD.md).

Production checks passed 21 changed documentation entries across 84 light/dark layouts at 360 and 1440px. The narrative pages passed six phone/tablet/desktop contexts. Six WebKit mobile workflows passed on the first run; the remaining home case passed after correcting an over-specific whitespace assertion in the test. No application change was required for that assertion.

Final integration passed AgentChat, Icon and AnimatedIcon across 12 additional layouts, plus both 360px marketing themes. The local consumer installed/refreshed all 90 entries through shadcn, compiled and loaded every entry, checked 89 exact stylesheet files and exercised 19 rendered specimens with no runtime errors. Public deployment and a fresh public-URL consumer were not completed; the owner has now paused those release steps for local review.

## Scope and limits

These checks use desktop browser engines and mobile viewport/touch emulation; they do not claim physical iPhone testing or every possible device. Native HTML selects retain platform-owned popup rendering. Menu search keeps cmdk's filtering semantics. The conversation showcase stores messages locally in its mounted example; it does not imply a connected model or backend. Dropzone accepts and rejects Files but does not upload them.

Detailed implementation and evidence: [controls](REFINEMENT-CONTROLS.md), [menus and icons](REFINEMENT-MENUS-ICONS.md), [theme and scrolling](REFINEMENT-THEME-SCROLL.md), and [marketing](REFINEMENT-MARKETING.md), and [general icon feedback](REFINEMENT-ICON-FEEDBACK.md). Earlier `OVERHAUL-*` reports remain historical evidence.

The library remains MIT licensed. GitHub Pages is the chosen hosting destination; a custom domain is a later owner decision.
