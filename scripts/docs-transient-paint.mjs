/** Observe finite computed paint from the real click, before driver latency can miss it. */
export async function armOpacityObservation(target, trigger, { units = null, upperBound = null } = {}) {
  const button = await trigger.elementHandle();
  const observation = await target.evaluateHandle((element, { button, units, upperBound }) => {
    let frame = 0;
    let timer = 0;
    const evidence = { seen: false, frames: 0 };
    const cancel = () => {
      button.removeEventListener("click", start, true);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    const sample = () => {
      evidence.frames++;
      const nodes = units ? [...element.querySelectorAll(units)] : [element];
      evidence.seen = nodes.some(node => {
        const opacity = Number(getComputedStyle(node).opacity);
        return opacity > 0 && (upperBound === null || opacity < upperBound);
      });
      if (evidence.seen) cancel();
      else frame = requestAnimationFrame(sample);
    };
    function start() {
      // Same finite observation budget as eventually(); retain the evidence
      // after completion so a delayed driver can still inspect actual paint.
      timer = setTimeout(cancel, 3500);
      frame = requestAnimationFrame(sample);
    }
    button.addEventListener("click", start, { once: true, capture: true });
    return { evidence, cancel };
  }, { button, units, upperBound });
  return {
    seen: () => observation.evaluate(state => state.evidence.seen),
    async dispose() {
      try { await observation.evaluate(state => state.cancel()); }
      finally { await observation.dispose(); await button.dispose(); }
    },
  };
}
