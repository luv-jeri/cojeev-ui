/**
 * Observe finite computed paint from the real activation, before driver latency
 * can miss it.
 *
 * A transient state can be over before a driver round-trip completes, so a case
 * that polls computed style from Node races the animation it is trying to prove.
 * Arm this **before** the activating action: sampling runs in the page on every
 * animation frame, and `seen()` reports whether any frame actually painted the
 * intermediate value.
 *
 * Arming is a real ordering barrier — `armOpacityObservation` does not resolve
 * until the page reports a frame is scheduled — so no event listener is involved
 * and the observation cannot depend on where the activation event travels. That
 * matters for a decorative target, which is typically a sibling of its control
 * rather than an ancestor of it and therefore never sees the control's event.
 */
export async function armOpacityObservation(target, { units = null, upperBound = null, budget = 3500 } = {}) {
  const observation = await target.evaluateHandle((element, { units, upperBound, budget }) => {
    let frame = 0;
    let timer = 0;
    const evidence = { seen: false, frames: 0, lowest: 1 };
    const cancel = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      timer = 0;
    };
    const sample = () => {
      evidence.frames++;
      const nodes = units ? [...element.querySelectorAll(units)] : [element];
      const values = nodes.map(node => Number(getComputedStyle(node).opacity));
      evidence.lowest = Math.min(evidence.lowest, ...values);
      evidence.seen = values.some(opacity => opacity > 0 && (upperBound === null || opacity < upperBound));
      if (evidence.seen) cancel();
      else frame = requestAnimationFrame(sample);
    };
    // Sampling is running from this point. The budget matches eventually() and
    // the evidence is retained after it, so a delayed caller can still read what
    // the page actually painted.
    frame = requestAnimationFrame(sample);
    timer = setTimeout(cancel, budget);
    return { evidence, cancel, armed: true };
  }, { units, upperBound, budget });
  // Do not return until the page confirms sampling is live: everything the caller
  // does next must already be observed.
  await observation.evaluate(state => state.armed);
  return {
    /* `seen` reports an *intermediate* paint: a value above zero but below
     * `upperBound`. A transient that passes through fully transparent instead
     * (a blink whose mark disappears) is not intermediate, so read `evidence()`
     * and assert the extreme directly. `lowest` is the minimum opacity any
     * sampled frame painted. */
    seen: () => observation.evaluate(state => state.evidence.seen),
    evidence: () => observation.evaluate(state => ({ seen: state.evidence.seen, frames: state.evidence.frames, lowest: state.evidence.lowest })),
    async dispose() {
      try { await observation.evaluate(state => state.cancel()); }
      finally { await observation.dispose(); }
    },
  };
}

/**
 * Record the opacity values an element actually paints, in order.
 *
 * `armOpacityObservation` samples computed style on animation frames, which is
 * the right instrument for a transient that arrives on a frame the driver cannot
 * wait for — but a starved host can deliver a handful of frames across a whole
 * finite animation, so a frame-sampled reading can miss a pass entirely.
 *
 * This records the style writes themselves instead. Each write is delivered to a
 * MutationObserver microtask, so the sequence is complete regardless of how many
 * frames the host renders: the record says what the element's opacity became, not
 * whether the renderer kept up. Pair it with a paused clock stepped by `runFor()`
 * and the sequence is fully deterministic — a three-blink mark records exactly
 * `[1, 0, 1, 0, 1, 0]`, plus a trailing `1` once the pass settles.
 */
export async function recordOpacitySequence(target) {
  const record = await target.evaluateHandle(element => {
    const evidence = { values: [], lowest: 1, writes: 0 };
    const read = () => {
      const value = Number(getComputedStyle(element).opacity);
      evidence.writes++;
      evidence.lowest = Math.min(evidence.lowest, value);
      if (evidence.values[evidence.values.length - 1] !== value) evidence.values.push(value);
    };
    const observer = new MutationObserver(read);
    observer.observe(element, { attributes: true, attributeFilter: ["style"] });
    read();
    return { evidence, stop: () => observer.disconnect() };
  });
  return {
    values: () => record.evaluate(state => state.evidence.values),
    lowest: () => record.evaluate(state => state.evidence.lowest),
    async dispose() {
      try { await record.evaluate(state => state.stop()); }
      finally { await record.dispose(); }
    },
  };
}
