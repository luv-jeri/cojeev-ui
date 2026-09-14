# The Bond prototype verification

Local demo, not a published product or checkpoint acceptance.

Build passed; Vite reported 2.30 seconds of build time, separately from editing, debugging and browser inspection. The shared shader still accounts for the existing large-chunk warning. The new demo entry adds about 3.92KB gzip JavaScript, plus its CSS, while reusing shared component chunks.

Inspected the bonding and coordinated-agent scenes on desktop, and the identity scene at 390x844 in midnight. Verified chapter selection and Creative -> Precise mind switching. Fixed header stacking and mobile connection alignment. Mobile had no horizontal overflow and one shader canvas; the identity control and chapter navigation do not overlap.

Pause set both the demo and shader data-moving flags to false. The illustrative SMIL signals are removed while paused; CSS ambient motion pauses and the sequence timer stops. The 40vh drawer measured 337.59375px in an 844px viewport. Feature descriptions, close control and concept disclaimer render. No captured page warnings/errors during the checked states. Reduced-motion behavior uses the same shared visibility hook already verified in the background work; no new physical-device or broad performance claim is made.

All shapes and controls come from Cojeev components. The story geometry is local demo composition. Launch manifest remains unset. No backend, model calls, signup or publication.

Autoplay check: Replay entered Arrival (chapter 0), then advanced to The bond (chapter 1) after 4.3 seconds while moving=true.
