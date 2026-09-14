# Prompt-led Bond demo — 14 September 2026

Owner-directed refinement, local visual review only.

Job: show one prompt becoming more capable through a living bond.
Metaphor: two curious organisms clasp the prompt and carry context along curved paths.
Hierarchy: one headline, editable example prompt, one changing cue. Preserve approved shaders, countdown and curved 40vh footer.
Interaction: Enter/arrow starts an eight-beat lifecycle: clasp, recall, prepare with instructions/skill, share, check response, save memory, suggest automation, settle. No auto-start. Replay resets. Next permits manual stepping; quiet motion keeps every stage readable. Pause, hidden page and open drawer suspend timing.
Scope: illustrative React state only; no real prompt submission, team sharing, saved memories or automations.

Implementation plan
- Replace the former chapter controls and organism stage in bond-demo.tsx with PromptBond; retain existing surrounding controls.
- Put lifecycle timing and authored scene in src/prompt-bond.tsx; use Cojeev InputControl, Button, AnimatedIcon and ShapeMorph.
- Style the scene in src/prompt-bond.css with bounded CSS motion; no extra renderer or dependency.
- Verify Enter, manual sequence, pause/resume, replay, footer, light/dark and mobile geometry. Run the app build once after refinements.
- Copy only changed files to the durable isolated worktree and compare hashes. Owner visual acceptance and publication remain separate.
