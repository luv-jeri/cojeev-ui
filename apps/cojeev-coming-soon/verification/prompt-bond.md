# The Bond: living prompt and conversation panel — 14 September 2026

Local visual demo at http://127.0.0.1:4345/bond.html, dev copy. No deployment, backend or launch manifest change (`public/launch.json` still `startedAt: null`).

## Round 3: the conversation goes on, and the organism shows what it reaches for

Owner feedback after round 2, and what was done with each point:

1. **Only one message was shown; let the conversation continue.** The panel keeps a fixed height, so earlier exchanges fold instead of scrolling: when a new thought is sent, the current rows fade, the previous prompt folds into one line at the top rim of the panel (its prompt, a small chip with what was kept, and `+n earlier` once there are more), and the new bubble rises below it. Each thought recalls what the one before it kept, so the thread reads as one memory building on the last.
2. **More stories.** Four illustrative thoughts cycle, each with its own memories, woven-in skill, teammate and subagent, kept item, automation offer and reply shape: plan the launch, draft the release notes, summarize the week, why the deploy failed. The empty field types the next one after 6.5 s idle, or at once on Enter.
3. **The send button becomes a stop button.** From the moment a thought is sent until the story settles, the arrow crossfades into a small breathing square. Pressing it stops the organism: what had already been reached stays in the panel, the rest is let go, the cue reads "Stopped. Whenever you're ready." and the composer is live again. The next thought folds the stopped exchange without a kept chip. The stop is disabled only during the bond itself. (A detail worth knowing: the same button is a submit button once the composer returns, so the stop handler cancels the click's default action; otherwise the browser would submit the form in the same click and send the next thought immediately.)
4. **The things pulled from outside were only text; make them graphical.** They are now cards: a glyph (file, brain, list, terminal, git branch, bookmark, bot, or a teammate's initials on a blue disc) with a title and a subtitle, and the membrane grows a pocket around the whole card, so it reads as something held rather than a label floating nearby. When a memory is pulled, the card folds to its glyph and rides the pocket in through the rim onto its row; the row's own glyph chip (brain, sparkles, people, bookmark) swells as it lands. The agents receive the task packet and swell; the kept card is carried out and stored. On narrow screens the cards are glyph-only so nothing is clipped.
5. **More character.** All six organisms have eyes at rest (the small ones smaller). During the story the lead widens its eyes when a memory appears and when the automation offer arrives, half-lids while the reply types, squints when the fusion pulse hits, blinks at the check and when something is kept; the right head wakes to watch the teammate and subagent during reach, then sleeps again.

Dark mode was reviewed as well (owner's mid-round note): cards, fold line, row chips, stop square and eyes all keep their fixed ink-on-body colours on the pastel body, so nothing depends on the page theme; the dark camera dolly from round 2 stays. One dark-only defect was found and fixed: a card's words briefly sat outside its shrinking pocket, invisible ink on a dark page, because two tweens on the same pocket key overlapped. Pocket shrink and text fold now run together, and the kept card's pocket opens only after its travel ends.

## Files

- `apps/cojeev-coming-soon/src/prompt-bond.tsx`: the story (`stories`, folds, node cards on box pockets, stop, eyes for all six, row pulses).
- `apps/cojeev-coming-soon/src/prompt-bond.css`: cards, fold line, row glyph chips, send/stop faces, small eyes, compact cards.
- Unchanged this round: `registry/cojeev/lib/membrane-field.ts`, `registry/cojeev/ui/membrane.tsx` (local membrane prototype, not a registry entry), `registry/cojeev/ui/shader-background-scene.tsx` (dark `cDistance: 2.4`), `bond-demo.css`.
- The library's `Avatar` was not used for the teammate initials: this app does not install `@radix-ui/react-avatar`, and adding a dependency for one 26 px disc was not worth it. The initials disc uses the same `--v-blue` / `--v-on-accent` tokens as the library avatar.

## Checks (Playwright, Chrome channel, headless)

`prompt-bond-checks.json` holds both suites. The round-2 lifecycle suite still passes 53/53 (renderer, roaming, empty-Enter typing, bond, launch geometry, pause, footer, settle, second thought, replay, idle, reduced motion, mobile). The round-3 details suite passes 45/45: six pairs of eyes at rest; arrow → disabled stop during the bond → live stop after launch; memory cards with words at recall; row glyphs; teammate and subagent cards; right head awake during reach; lead half-lidded while typing; kept card outside; arrow back at settle; second thought folds the previous exchange above the new bubble and recalls what was kept; rows and fold fit above the composer; third thought counts `+1 earlier`; stop mid-reach keeps rows 1–3 only, shows the stop cue, leaves the composer editable, and the next thought launches with a fold and no kept chip; reduced motion shows both memory cards and both agent cards at their stills, stop works, a second thought shows the fold and the new bubble at once; mobile has compact glyph-only cards on screen, settles twice, fits every row and the fold above the composer, no horizontal overflow. No page errors in any run.

Build: `prompt-bond-build.log`, exit 0. Only the pre-existing `"use client"` directive warnings from the registry and the pre-existing chunk-size warning.

Visual review: `prompt-bond-details.jpg` (the new moments in light and dark: launch, recall, pull, reach, packet, typing, keep, notice, settle, fold, second recall), `prompt-bond-light.png` and `prompt-bond-dark.jpg` (full desktop runs), `prompt-bond-quiet.png` (reduced-motion stills per beat, light over dark), `prompt-bond-mobile.png` (mobile stills and run). Defects found and fixed during review: pocket and glyph drifting apart during the pull (overlapping tweens); the kept card's pocket centred on the glyph instead of the card (same cause); the fold pushing rows under the composer (the fold now lives in the panel's top rim); the reduced-motion recall still landing before the second card was readable (timings); a stop click submitting the form in the same click.

## Limits

Illustrative only: no prompt is sent anywhere, no memory, teammate, agent or automation exists; the four stories are fixed text. Headless Chrome timing is not a device profile; no physical phone or low-end GPU was measured. Owner visual acceptance is pending.
