# Preservation-first component polish

Checkpoint: H03-1. Source baseline: `999e9d3`.
Sanjay approved the direction on 13 September: preserve the current variants,
clarify shape symbols, improve spacing, and calm the Accordion composition.
This document records the bounded implementation contract; written review is pending.

## Job and visual idea

Make the existing choices understandable and the answers easy to read.
Use a carefully arranged notebook: precise labels, quiet divisions, and one
expressive surface per item. Keep the library's living contours, not extra decoration.

## Choice workbench — H03-2

- Preserve Organic, Circle, Rounded, Pebble, Leaf and Flower; retain every
  selected-mark option and show/hide setting. Keep Row, Card and Chip.
- In the Glyph shape menu, replace unrelated automatically chosen icons with
  the actual named silhouettes. Keep visible text, selected-state indication,
  keyboard operation and pointer-transparent decoration.
- Reuse existing silhouette geometry. Do not change global Select adornments,
  the shared morph engine, public defaults, or the resting shape geometry.
- The main specimen keeps its full heading, help and selected-value summary.
  Compact comparison tiles omit repeated introductions so their approach labels
  lead. Keep accessible group names and selection feedback in every interactive tile.
- Use one closing divider for the Row specimen, not two adjacent rules.
  Changing shape, mark, approach, theme or background must preserve selection.

## Accordion — V50-1

- Keep FAQ, Chapters and Editorial distinct and visible in the gallery.
- FAQ gets a quiet resting edge or tonal separation. Preserve the full-row
  activation area and a consistently aligned indicator; do not chase text width.
- Chapters keeps its numbered spine. Align the trigger and answer's reading
  column using the existing spacing rhythm and allow long titles to wrap.
- Editorial keeps one supporting illustration. On desktop it is subordinate to
  the answer; on narrow screens it becomes a small accompanying motif rather
  than a large illustration/caption block before the text.
- Preserve the disclosure-height owner, stable pointer targets, icon response,
  contour motion, native semantics, controlled state and forwarded refs.

## Motion, touch and failure boundaries

No new idle animation, dependency, global event listener or competing transform
owner. Preserve reduced motion, Motion Off and Flow Off: content is accessible
immediately without animation. Rapid open/close must settle without clipped
answers. Do not hide focus outlines or remove options to simplify the design.
Do not alter glyph/mark geometry unless a separately reproduced defect warrants it.

## Verification and delivery

Before/after: the real Checkbox, Radio Group and Accordion documentation pages
at desktop and 390px, light and dark. Inspect the actual images, not only overflow
measurements. Test shape/mark selection, retained values, keyboard/focus, disabled
states where applicable, long labels, all approaches and rapid reversal.
Check representative quiet-motion states separately. Keep copy aligned with the
selected configuration; regenerate and validate affected installable payloads
for any registry-source change.

Each implementation checkpoint gets its own conventional commit and PR. Primary
review covers code, interaction and visuals; independent visual review is an
additional check, not owner approval. Run affected tests, not the whole catalogue
for every edit. The combined release gate and production approval remain separate.

No homepage redesign, new variants, broad motion repair, deployment or registry
submission is included. H03, V12, V13 and V50 remain open until their applicable
implementation, verification and visual acceptance are complete.
