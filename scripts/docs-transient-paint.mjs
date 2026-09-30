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

/**
 * Record the states the page actually paints after a trigger. From the trigger's
 * real click, every DOM change under `target` is read with `read` (a page function
 * of the target element), so a driver that samples late, after the animation has
 * finished, still sees the intermediate states the product painted in between.
 */
export async function recordPaint(target, trigger, read) {
  const button = await trigger.elementHandle();
  // Playwright turns page functions into page values from their source in the same way.
  const reader = await target.page().evaluateHandle(`(${read})`);
  const recording = await target.evaluateHandle((element, { button, reader }) => {
    const values = new Set();
    const observer = new MutationObserver(() => values.add(reader(element)));
    const start = () => observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });
    button.addEventListener("click", start, { once: true, capture: true });
    return { element, reader, values, before: reader(element), stop: () => { button.removeEventListener("click", start, true); observer.disconnect(); } };
  }, { button, reader });
  return {
    /** Distinct values since the trigger; `between` excludes the value before it and the current one. */
    seen: () => recording.evaluate(({ element, reader, values, before }) => {
      const now = reader(element), all = [...values];
      return { before, now, values: all, between: all.filter(value => value !== before && value !== now) };
    }),
    async dispose() {
      try { await recording.evaluate(state => state.stop()); }
      finally { await Promise.all([recording.dispose(), reader.dispose(), button.dispose()]); }
    },
  };
}
