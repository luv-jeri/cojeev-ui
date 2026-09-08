# Agent workspace implementation

September 8, 2026. Scope: new reusable agent components, their styles, examples and focused tests. No backend calls, uploads, file reads or writes occur in the interactive demo.

## Public contracts

- `AgentState`: `status?: AgentStatus` (`idle`, `thinking`, `working`, `needs-input`, `complete`, `error`), `size?: "sm" | "md" | "lg"`, `label?: string`, `description?: string`, and div attributes except children. Readable status uses a polite atomic live region. SVG artwork is decorative with unique gradient/clip IDs. Motion interpolates equal-topology cubic paths and a folded chromatic field. Active loops pause offscreen, while the document is hidden, and under shared Off/reduced-motion settings. Other states settle into distinct static silhouettes and glyphs.
- `AgentChat`: section attributes, including `children`. A bounded flex column for header, thread and composer; consumers can insert their own content and override class/style. Default width 100%, maximum 520px, height bounded by the viewport.
- `AgentChatLayout`, `AgentChatMain`, `AgentChatAside`: div/div/aside attributes and children. Dedicated two-column work surface with an unconstrained main area and 320–420px conversation side column. Below 900px the areas stack. Aside is sticky on wide screens and restores normal flow on mobile. Chat within the aside fills its column.
- `AgentChatHeader`: header attributes plus `title`, `description`, `status`, `statusLabel`, `actions` and `children`.
- `AgentChatThread`: all `MessageScrollerProps`, including `ref`, `followThreshold`, `onAtBottomChange` and scroll handlers; plus `jumpLabel`. Composes Bubble at the MessageScroller root and its existing observer-driven follow behavior and the explicit latest-message jump. Exposes a keyboard-focusable conversation log.
- `AgentChatMessage`: div attributes plus `author`, `from: "agent" | "user"`, `avatar?: ReactNode`, `meta`, `actions`, and children. Composes Message/MessageContent/MessageDescription, Avatar/AvatarFallback and BubbleContent; a MotionSurface merges onto the Message root without an extra DOM wrapper. The host can supply its own Avatar composition through `avatar`. Long text wraps; preformatted content scrolls inside its own boundary.
- `AgentChatComposer`: form attributes except onSubmit/onChange, required controlled `value`, `onValueChange(value)` and `onSend()`; optional `status`, `onStop`, `attachments`, `onAttach(files: File[])`, `onRemoveAttachment(id)`, `accept`, `disabled`, `placeholder`, `label`, `hint`, `error`, `onRetry`, `maxLength` (default 12000), and children. `AgentChatAttachment` is `{id, name, type?, detail?}`. The host owns draft clearing, file retention, upload, submission and retry. Empty or whitespace-only drafts cannot send without attachments. Thinking/working replace Send with Stop; Ctrl/Cmd+Enter submits, Enter creates a new line, composition input is protected. Attachment controls appear only when callbacks are supplied. Attachment and draft regions have independent height bounds.
- `AgentChatPermission`: div attributes plus required `title`, `description`, `onDecision("allowed" | "denied")`; optional `scope`, `decision` (pending/allowed/denied), `disabled`, `allowLabel`, `denyLabel`. Pending decisions have separate Deny/Allow once buttons. Decided states expose an inert receipt, with no actionable Allow button.
- `AgentChatOptions`: div attributes plus required `title`, `options`, `onValueChange`, `onConfirm`; optional controlled `value`, `disabled`, `confirmLabel`. `AgentChatOption` is `{value, label, description?, disabled?}`. Composes native radio questionnaire options. Continue stays disabled unless the selected option exists and is enabled.
- `AgentChatProgress`: ordered-list attributes and required `steps`. `AgentChatStep` is `{id, label, detail?, status: "pending" | "current" | "complete" | "error"}`. Current item receives aria-current="step". All states have words available to assistive technology.

## Dependencies and integration

- Agent state: React, `motion/react`, the shared `useChoreography`, and `cn`.
- Agent chat: agent-state, Message, MessageScroller, Bubble, Avatar, Attachment, Questionnaire, Button, Input, InputGroup and Presence; React, `lucide-react` and utilities. InputGroupTextarea delegates to the existing Textarea for multiline semantics and inherits input-family surface/focus tokens. Input is the actual native file-picker primitive. InputGroupButton delegates to Button. Presence supplies AnimatePresence and shared choreography; no independent animation engine is introduced.
- Styles: `registry/sahajiv/styles/agent-state.css` and `agent-chat.css`; existing semantic typography, color, surface and foreground tokens are used in both themes.
- Examples: `AgentStateExample` supports status variants and sm/md/lg sizes; `AgentChatExample` is a self-contained local simulation. Both use the existing function-based source extraction architecture.
- `AgentWorkspaceExample` composes the layout parts, Badge, Card, Button, and AgentChatExample for a standalone workspace route. Three selectable sample tasks reveal their own result. Mark reviewed/Reopen review changes local review state and the reviewed count. Sample results and the separate conversation demo are labelled explicitly; the review area does not pretend to be receiving backend activity.
- Parent owns registry metadata/dependency closure, example manifest/index, guides, global CSS imports, build and consumer verification.

## Reachable demo controls

1. Send a draft, submit Ctrl/Cmd+Enter, or activate either starter prompt.
2. Thinking lasts 1.4 seconds and can be stopped. Then an explicit permission request receives keyboard focus.
3. Deny records denial and ends the run. Allow once reveals format selection. Cancel request stops either decision step.
4. Select a short brief or a thoughtful plan and Continue. Working lasts 1.8 seconds and can be stopped. The selected option changes the resulting content.
5. Try an error starts a run that fails after the same permission/format workflow. Retry preserves the request and asks permission again, then completes.
6. Attach files opens the native picker, adds local name/size metadata to a tray, and permits removal. No content is read or uploaded. Sending records the attachment names in the conversation and permission scope.
7. Reset clears the local run and its timers. The demo is explicitly labelled both above the workspace and below the composer.

## Evidence

- `node --import tsx --test tests/agent-chat.test.ts`: 4/4 pass. Covers whitespace/attachment submission gating, Stop availability while running, explicit permission actions/denied receipt, valid enabled option gating, readable six-state output, and unique SVG IDs.
- `npm run typecheck`: passed after new implementation and after adding the sidechat layout/workspace example.
- Impeccable detector over both UI sources, both styles and the example: no mechanical findings.
- After atomic reuse and presence adoption, `check-docs --ids=agent-chat --widths=390,1440 --themes=light,dark` passed all four layout contexts, source-preview controls and existing behavior checks: keyboard send, explicit denial, Stop cancellation of timers, attachment/remove, error and retry through a sample result. Receipts: `output/playwright/overhaul-agent-presence/results.json` (earlier atomic-only check in `overhaul-agent-atomic`).
- Open option states captured at both widths/themes and inspected mobile/dark plus desktop/light screenshots. Confirmed two visible Avatar/BubbleContent compositions in workflow DOM. Scoped shell styling corrects the integrated ScrollArea default max-height: final 700px mobile shell contains a117.25px header,389.75px thread and191px composer without unused bottom space.
- Actual permission exit lifecycle: at30ms the retained Deny/Allow branch is `inert` and `aria-hidden=true`; by350ms it is removed. Under prefers-reduced-motion, no retained exit remains at30ms. `output/playwright/overhaul-agent-presence/lifecycle.json` records these assertions and actual shell bounds. Inspected the final mobile screenshot.
- Current integrated `tsc --noEmit` passes. Focused SSR tests remain4/4 passing.
- Long-running backend streaming, real uploads/provider integration and every arbitrary nested custom child remain unverified; this demo implements no backend. AgentState SVG active loops have source-level visibility/quiet guards, with parent owning full shared motion-clock acceptance.

## Files owned by this stream

`registry/sahajiv/ui/agent-state.tsx`, `registry/sahajiv/ui/agent-chat.tsx`, `registry/sahajiv/styles/agent-state.css`, `registry/sahajiv/styles/agent-chat.css`, `components/examples/agent.tsx`, `tests/agent-chat.test.ts`, and this report.

## Keyed lifecycle composition

`AgentChatExample` keeps a MotionPresence boundary around the welcome panel, keyed message list, workflow message and completion state. Real permission and option conditionals have nested boundaries. `AgentChatMessage` defines rise initial/animate/exit states through MotionSurface asChild, preserving Message's actual DOM root/ref; callers should retain a MotionPresence boundary around their keyed message removals. Composer attachment tray/items and error/retry content have their own boundaries. Permission pending actions crossfade into a decision receipt; exiting controls immediately become inert via shared MotionSurface. The Send/Stop control swaps directly so Stop remains immediately available throughout thinking/working. Timers and cancellation behavior remain host/demo state, independent of animation completion.

## Final workspace integration correction

Workspace task title/detail now use a named content class and block b/small display rather than `:first-child`; useMorph's injected SVG can precede authored content without breaking the text layout. Live `/workspace` verification found the title and description on separate lines (y373.8/y391.8,18px separation). The welcome now uses a compact prompt paragraph and two real starter actions; Header remains the single AgentState display. Its initial desktop thread has scrollTop0 and clientHeight=scrollHeight442px, with the whole welcome visible. Inspected `workspace-final-desktop.png` and `composed-mobile-dark.png`. Parent subsequently corrected shared ::selection foreground.
