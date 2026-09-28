/**
 * Shared harness for the `/assembly/` route checks.
 *
 * Two things in here are worth more than the plumbing around them.
 *
 * **The panel is measured, not inferred.** The sculpted panel is WebGL geometry
 * with no DOM node of its own, so the controller publishes its four projected
 * corners on `.asm[data-panel-quad]`. Everything that asks "does chapter copy
 * cross the object" reads that, which means the answer comes from the same
 * projection that draws the frame rather than from a stylesheet's intent.
 *
 * **Contrast is measured against the pixels behind the glyphs.** The page is
 * shot twice — once normally and once with the glyph fill made transparent — so
 * the second frame is the actual backdrop under every letter, including the
 * WebGL canvas. The composited foreground is then evaluated against each of
 * those local backdrops, so a paragraph that spans a dark ground and a pale
 * panel is judged at the pale end rather than at the average. The frame pair is
 * also compared outside the text boxes and the measurement is refused if the
 * scene moved between the two shots, because a moving canvas would make the
 * "background" a different frame from the "foreground".
 */
import { PNG } from "pngjs";

export const CHAPTERS = ["hero", "catalogue", "motion", "shape", "source", "closing"];

/** The five sizes the page is qualified at, in ascending width. */
export const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "compact", width: 1024, height: 768, deviceScaleFactor: 1 },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: "wide", width: 1920, height: 1080, deviceScaleFactor: 1 },
];

export const THEMES = ["light", "dark"];

export function assemblyUrl(base) {
  const root = base ?? process.env.BASE_URL ?? "http://127.0.0.1:4321/cojeev-ui";
  return new URL("assembly/", root.endsWith("/") ? root : `${root}/`).href;
}

/**
 * A draw-call counter installed before the page loads.
 *
 * The page renders on demand and settles to zero frames, which makes "no draws
 * for N ms" both the readiness signal every capture waits on and the evidence
 * that idle costs nothing. Counting on the real prototypes rather than trusting
 * a flag is the point.
 */
const DRAW_COUNTER = () => {
  window.__asmDraws = 0;
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const fn of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      const original = proto[fn];
      if (!original) continue;
      proto[fn] = function (...args) {
        window.__asmDraws++;
        return original.apply(this, args);
      };
    }
  }
};

/**
 * Fails WebGL at the source the app actually probes: `isWebglAvailable` builds a
 * throwaway canvas and asks it for a context, so a `getContext` that returns
 * null for every WebGL flavour is the honest simulation of a browser without it.
 */
const NO_WEBGL = () => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    if (typeof kind === "string" && kind.toLowerCase().includes("webgl")) return null;
    return original.call(this, kind, ...rest);
  };
};

export async function openAssembly(browser, options = {}) {
  const {
    viewport,
    theme = "light",
    reducedMotion = "no-preference",
    noWebgl = false,
    base,
    countDraws = true,
  } = options;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false,
    colorScheme: theme,
    reducedMotion,
  });
  await context.addInitScript((value) => {
    try {
      window.localStorage.setItem("cojeev-docs-theme", value);
    } catch {
      /* private mode: the colorScheme option still drives the media query */
    }
  }, theme);
  if (countDraws) await context.addInitScript(DRAW_COUNTER);
  if (noWebgl) await context.addInitScript(NO_WEBGL);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error.message ?? error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(assemblyUrl(base), { waitUntil: "load" });
  return { context, page, errors, url: assemblyUrl(base) };
}

/** Waits until the scene has drawn nothing for `quiet` ms. */
export async function waitForIdle(page, { quiet = 400, timeout = 45000 } = {}) {
  const counted = await page.evaluate(() => typeof window.__asmDraws === "number");
  if (!counted) {
    await page.waitForTimeout(quiet);
    return { draws: null, waited: quiet, uncounted: true };
  }
  const started = Date.now();
  let last = await page.evaluate(() => window.__asmDraws);
  let quietSince = Date.now();
  for (;;) {
    await page.waitForTimeout(quiet);
    const now = await page.evaluate(() => window.__asmDraws);
    if (now === last) {
      if (Date.now() - quietSince >= quiet) return { draws: now, waited: Date.now() - started };
    } else {
      quietSince = Date.now();
      last = now;
    }
    if (Date.now() - started > timeout) return { draws: now, waited: Date.now() - started, timedOut: true };
  }
}

export async function waitForScene(page, { timeout = 60000 } = {}) {
  await page.waitForFunction(
    () => document.querySelector(".asm")?.dataset.webgl === "ready",
    null,
    { timeout },
  );
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(900);
  await waitForIdle(page, { quiet: 350 });
}

/**
 * A chapter's resting scroll offset.
 *
 * `scrollProgress` sums one `smootherstep` per boundary, each spanning
 * `BOUNDARY_BAND` viewport heights from `BOUNDARY_LEAD` before a section top, and
 * the focus line is the middle of the viewport. A chapter therefore carries full
 * weight — the pose it was authored at — when the focus line sits
 * `BOUNDARY_BAND - BOUNDARY_LEAD` of a viewport below its section top, which is
 * `scrollY = top - 0.2 * viewportHeight`. Scrolling a section to `block: "start"`
 * instead lands a fifth of a viewport *past* that, with the frame already a
 * quarter of the way into the next chapter. A measurement taken there describes a
 * frame nobody authored.
 */
export const BOUNDARY_BAND = 0.6;
export const BOUNDARY_LEAD = 0.3;
export const REST_OFFSET = 0.5 - (BOUNDARY_BAND - BOUNDARY_LEAD);

export async function sectionTops(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-assembly-section]")]
      .map((node) => ({ id: node.id, top: node.offsetTop }))
      .sort((a, b) => a.top - b.top),
  );
}

export async function restOffsetFor(page, id) {
  const tops = await sectionTops(page);
  const index = tops.findIndex((item) => item.id === id);
  if (index === -1) throw new Error(`no [data-assembly-section] with id "${id}"`);
  const viewport = page.viewportSize();
  return { y: Math.max(0, tops[index].top - REST_OFFSET * viewport.height), top: tops[index].top, index, count: tops.length };
}

/** Scrolls to a chapter's authored resting pose and lets the scene settle. */
export async function gotoChapter(page, id, { settle = true } = {}) {
  const { y } = await restOffsetFor(page, id);
  await gotoOffset(page, y, { settle: false });
  if (settle) {
    await page.waitForTimeout(700);
    await waitForIdle(page, { quiet: 300 });
  }
}

/** Scrolls to an absolute offset and lets the scene settle. */
export async function gotoOffset(page, y, { settle = true } = {}) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  if (settle) {
    await page.waitForTimeout(500);
    await waitForIdle(page, { quiet: 250 });
  }
}

/* ------------------------------------------------------------------ contrast */

export function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `rgb(r, g, b)` / `rgba(r, g, b, a)` / `color(srgb ...)` to `[r, g, b, a]`. */
export function parseColour(value) {
  const text = String(value).trim();
  const match = text.match(/^rgba?\(([^)]+)\)$/i);
  if (match) {
    const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  const srgb = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
  if (srgb) {
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
      srgb[4] === undefined ? 1 : Number(srgb[4]),
    ];
  }
  return null;
}

/** `alpha · fg + (1 − alpha) · bg`. */
export function composite([r, g, b, a], bg) {
  return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
}

const HIDE_ATTRIBUTE = "data-asm-contrast-hidden";
const HIDE_STYLE = `[${HIDE_ATTRIBUTE}] {-webkit-text-fill-color: transparent; text-shadow: none;}`;
/**
 * The coverage frame's colour. Glyph coverage has to be measured with a fill
 * that cannot be confused with the page's own palette: a cream heading on a pale
 * panel differs from its backdrop by about one part in 255, so a coverage mask
 * derived from "did the text change the pixels" would report that the heading is
 * not there — which is exactly the failure being looked for. Painting a known
 * magenta and solving for alpha separates "is there a glyph here" from "is the
 * glyph readable", and keeps the two answers independent.
 */
const COVER_STYLE = `[${HIDE_ATTRIBUTE}] {-webkit-text-fill-color: #ff00ff; text-shadow: none;}`;
const COVER_RGB = [255, 0, 255];

/**
 * Every element that owns a text node of its own, is visible, and is on screen.
 *
 * `chapter` is the section the element belongs to, which is how a failure is
 * attributed to a part of the page rather than to "the document".
 */
export async function collectTextTargets(page) {
  return page.evaluate((attribute) => {
    const root = document.querySelector(".asm");
    if (!root) return [];
    const withAlpha = (node) => {
      let alpha = 1;
      for (let el = node; el && el !== document.documentElement; el = el.parentElement) {
        const value = Number(getComputedStyle(el).opacity);
        if (Number.isFinite(value)) alpha *= value;
      }
      return alpha;
    };
    const out = [];
    for (const el of root.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement)) continue;
      const owns = Array.from(el.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent.trim())
        .join(" ")
        .trim();
      if (!owns) continue;
      /* The painted rect, not the layout rect. A code listing is a single text
         node inside a scrolling panel: its box is the whole listing — 2039px of
         it — while only the panel's window is painted. Measuring the layout box
         hands the element every pixel of that column, including the chapter rail
         and whatever else is scrolling past underneath, and reports the code as
         dark-on-dark at 1.01:1 when the visible code is 12:1 on its own panel.
         Clipping to every overflowing ancestor and to the viewport keeps the box
         equal to the pixels the element can actually paint. */
      const layout = el.getBoundingClientRect();
      let left = Math.max(layout.left, 0);
      let top = Math.max(layout.top, 0);
      let right = Math.min(layout.right, innerWidth);
      let bottom = Math.min(layout.bottom, innerHeight);
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const clip = getComputedStyle(parent);
        if (
          clip.overflow === "visible" &&
          clip.overflowX === "visible" &&
          clip.overflowY === "visible"
        )
          continue;
        const bounds = parent.getBoundingClientRect();
        left = Math.max(left, bounds.left);
        top = Math.max(top, bounds.top);
        right = Math.min(right, bounds.right);
        bottom = Math.min(bottom, bounds.bottom);
      }
      if (right - left < 2 || bottom - top < 2) continue;
      const rect = { left, top, width: right - left, height: bottom - top, right, bottom };
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      /* A closed `<details>` keeps its children's boxes but paints none of them,
         so a box alone is not evidence that there are glyphs to measure. */
      if (typeof el.checkVisibility === "function") {
        const painted = el.checkVisibility({
          checkVisibilityCSS: true,
          checkOpacity: true,
          opacityProperty: true,
          contentVisibilityAuto: true,
        });
        if (!painted) continue;
      }
      const opacity = withAlpha(el);
      if (opacity <= 0.01) continue;
      const section = el.closest("[data-assembly-section]");
      el.setAttribute(attribute, "");
      out.push({
        selector: `${el.tagName.toLowerCase()}.${String(el.className || "").split(/\s+/)[0] || "x"}`,
        text: owns.slice(0, 42),
        chapter: section?.getAttribute("data-assembly-section") ?? "page",
        box: [rect.left, rect.top, rect.width, rect.height],
        colour: style.color,
        opacity,
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight) || 400,
        letterSpacing: style.letterSpacing,
      });
    }
    return out;
  }, HIDE_ATTRIBUTE);
}

export async function clearTextTargets(page) {
  await page.evaluate((attribute) => {
    for (const el of document.querySelectorAll(`[${attribute}]`)) el.removeAttribute(attribute);
  }, HIDE_ATTRIBUTE);
}

/**
 * A settled page is byte-identical between two captures. A single switch knob's
 * composited shadow is not: it re-rasterises on its own now and then, in a patch
 * a few CSS pixels across, with no scene change behind it. So stability is
 * judged on the largest difference *and* on how much of the frame carries it —
 * a real scene move repaints broad areas and still fails both.
 */
const STABLE_DELTA = 8;
const STABLE_PIXELS = 400;

function frameDelta(a, b, mask) {
  let max = 0;
  let at = [0, 0];
  let count = 0;
  const width = a.width;
  for (let index = 0; index < width * a.height; index++) {
    if (mask && mask[index]) continue;
    const offset = index * 4;
    const delta = channelDelta(
      [a.data[offset], a.data[offset + 1], a.data[offset + 2]],
      [b.data[offset], b.data[offset + 1], b.data[offset + 2]],
    );
    if (delta > STABLE_DELTA) count++;
    if (delta > max) {
      max = delta;
      at = [index % width, Math.floor(index / width)];
    }
  }
  return { max, at, count };
}

const channelDelta = (a, b) =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/**
 * Contrast for every visible text element, against the pixels its glyphs sit on.
 *
 * Returns `{ rows, stable, drift }`. `stable` is false when the two frames differ
 * outside the text boxes — a moving canvas, a late font, a settling spring — in
 * which case the rows are not trustworthy and the caller must report the run as
 * failed rather than reporting numbers derived from two different frames.
 */
export async function measureContrast(page, options = {}) {
  const { pixelRatio = 1 } = options;
  /* Full-viewport screenshots, never a clip: a clipped capture makes the browser
     lay the page out beyond the viewport, which fires a resize at the scene and
     re-renders the canvas. The frames would then show different scenes and the
     "backdrop" would belong to none of them. */
  const targets = await collectTextTargets(page);
  /* The page's fixed chrome — the chapter rail, the feedback launcher, the
     header — is a known overlay: content under it is hidden, not unreadable, and
     reporting the two as one number is how a 76% rail scrim gets filed as a
     contrast defect in the code listing it happens to be covering. These rects
     classify the worst pixel of each row; they never excuse it. */
  const overlays = await page.evaluate(() =>
    [
      ["rail", ".asm-rail"],
      ["launcher", ".report-launcher"],
      ["header", ".asm-header"],
    ]
      .map(([name, selector]) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return null;
        return { name, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      })
      .filter(Boolean),
  );
  let backdrop;
  let covered;
  for (let attempt = 0; ; attempt++) {
    const hideHandle = await page.addStyleTag({ content: HIDE_STYLE });
    await waitForIdle(page, { quiet: 260 });
    backdrop = PNG.sync.read(await page.screenshot());
    await hideHandle.evaluate((node) => node.remove());
    const coverHandle = await page.addStyleTag({ content: COVER_STYLE });
    await waitForIdle(page, { quiet: 260 });
    covered = PNG.sync.read(await page.screenshot());
    await coverHandle.evaluate((node) => node.remove());
    if (attempt >= 2) break;
    /* A settled page is byte-identical between two captures, but a handful of
       composited pixels (a switch knob's own shadow, for one) re-rasterise
       differently now and then with no scene change behind them. Re-shooting the
       pair costs two screenshots and removes the flake without loosening the
       verdict for a frame that really did move. */
    if (frameDelta(backdrop, covered, null) <= STABLE_DELTA) break;
  }
  await clearTextTargets(page);

  const width = backdrop.width;
  const height = backdrop.height;
  const mask = new Uint8Array(width * height);
  const owner = new Int32Array(width * height).fill(-1);
  const boxes = targets.map((target) => {
    const [x, y, w, h] = target.box;
    const left = Math.max(0, Math.round(x * pixelRatio));
    const top = Math.max(0, Math.round(y * pixelRatio));
    const right = Math.min(width, Math.round((x + w) * pixelRatio));
    const bottom = Math.min(height, Math.round((y + h) * pixelRatio));
    if (right - left < 2 || bottom - top < 2) return null;
    /* Dilated by three device pixels: a glyph can overhang its layout box by a
       pixel of italic or letter-spacing, and that overhang would otherwise be
       counted as drift outside the text. */
    const pad = 3;
    for (let row = Math.max(0, top - pad); row < Math.min(height, bottom + pad); row++) {
      mask.fill(1, row * width + Math.max(0, left - pad), row * width + Math.min(width, right + pad));
    }
    return { left, top, right, bottom };
  });

  /* A glyph belongs to the smallest box that claims it. Layout boxes nest — a
     `<span>` inside a `<p>`, a `<code>` inside a `<pre>` that is itself several
     screens tall — and without this the outer element would be handed every
     glyph inside it, including ones painted in a different colour over a
     different backdrop. That is how a heading's own text gets reported against
     the code block it happens to overlap. */
  const order = targets
    .map((_, index) => index)
    .filter((index) => boxes[index])
    .sort((a, b) => {
      const boxA = boxes[a];
      const boxB = boxes[b];
      return (boxA.right - boxA.left) * (boxA.bottom - boxA.top) - (boxB.right - boxB.left) * (boxB.bottom - boxB.top);
    });
  for (const index of order) {
    const box = boxes[index];
    for (let row = box.top; row < box.bottom; row++) {
      const base = row * width;
      for (let column = box.left; column < box.right; column++) {
        if (owner[base + column] === -1) owner[base + column] = index;
      }
    }
  }

  /* Nothing outside a text box may differ between the two frames. If it does,
     the canvas moved between them and every "backdrop" below is from a frame the
     glyphs were never painted on — so the run is reported unstable and the
     caller must refuse to draw a conclusion from it. */
  const outside = frameDelta(backdrop, covered, mask);

  const rows = [];
  for (const [index, target] of targets.entries()) {
    const box = boxes[index];
    if (!box) continue;
    const parsed = parseColour(target.colour);
    if (!parsed) continue;
    const alpha = parsed[3] * target.opacity;
    let glyphs = 0;
    let worst = null;
    /* Solving `covered = a·magenta + (1 − a)·backdrop` for `a`, on whichever
       channel the magenta separates from this backdrop most. This is glyph
       coverage, and it is independent of what colour the glyph really is. */
    const coverage = (row, column) => {
      const offset = (row * width + column) * 4;
      const behind = [
        backdrop.data[offset],
        backdrop.data[offset + 1],
        backdrop.data[offset + 2],
      ];
      let best = { span: 0, alpha: 0 };
      for (let channel = 0; channel < 3; channel++) {
        const span = COVER_RGB[channel] - behind[channel];
        if (Math.abs(span) < Math.abs(best.span)) continue;
        const observed = covered.data[offset + channel] - behind[channel];
        best = { span, alpha: observed / span };
      }
      return { alpha: best.alpha, behind };
    };
    /* A glyph stroke is at least a couple of device pixels wide, so a lone
       covered pixel is an edge — the lit rim of a panel, the boundary between
       two of them — and not a stroke. Without this, a seven-pixel band at the
       top of a code panel was enough to report the whole listing as 2:1 when
       every visible line of it is 12:1 on its own surface. */
    const isStroke = (row, column) => {
      let neighbours = 0;
      if (column > 0 && coverage(row, column - 1).alpha >= 0.6) neighbours++;
      if (column + 1 < width && coverage(row, column + 1).alpha >= 0.6) neighbours++;
      if (row > 0 && coverage(row - 1, column).alpha >= 0.6) neighbours++;
      if (row + 1 < height && coverage(row + 1, column).alpha >= 0.6) neighbours++;
      return neighbours >= 2;
    };
    for (let row = box.top; row < box.bottom; row++) {
      const base = row * width;
      for (let column = box.left; column < box.right; column++) {
        if (owner[base + column] !== index) continue;
        const sample = coverage(row, column);
        const behind = sample.behind;
        if (sample.alpha < 0.6) continue;
        if (!isStroke(row, column)) continue;
        glyphs++;
        /* The colour the browser paints for this text: the declared value with
           its own alpha and every inherited `opacity` folded in, composited over
           this pixel's own backdrop. */
        const foreground = composite([parsed[0], parsed[1], parsed[2], alpha], behind);
        const ratio = contrastRatio(foreground, behind);
        if (worst === null || ratio < worst.ratio)
          worst = {
            ratio,
            backdrop: behind,
            foreground,
            /* Where the worst pixel is, so the caller can tell "this text is on a
               background it cannot be read against" from "this text is under the
               chapter rail". Both measure the same ratio and they are not the
               same finding. */
            at: [
              (box.left + column) / pixelRatio,
              (box.top + row) / pixelRatio,
            ],
          };
      }
    }
    const threshold =
      target.fontSize >= 24 || (target.fontSize >= 18.66 && target.fontWeight >= 700) ? 3 : 4.5;
    rows.push({
      ...target,
      box: target.box.map((value) => Math.round(value)),
      glyphs,
      threshold,
      ratio: worst?.ratio ?? null,
      backdrop: worst?.backdrop?.map((value) => Math.round(value)) ?? null,
      foreground: worst?.foreground?.map((value) => Math.round(value)) ?? null,
      occludedBy: worst
        ? (overlays.find(
            (overlay) =>
              worst.at[0] >= overlay.left &&
              worst.at[0] <= overlay.right &&
              worst.at[1] >= overlay.top &&
              worst.at[1] <= overlay.bottom,
          )?.name ?? null)
        : null,
      /* No glyph pixels inside the box at all: the element is not being painted
         where its box says it is, which is an occlusion to report rather than a
         contrast ratio to invent. */
      reason: glyphs === 0 ? "no-glyph-pixels" : null,
    });
  }
  const stable = outside.max <= STABLE_DELTA || outside.count <= STABLE_PIXELS;
  if (!stable) {
    const reason = `frames differ outside the text: max ${outside.max} at ${JSON.stringify(
      [Math.round(outside.at[0] / pixelRatio), Math.round(outside.at[1] / pixelRatio)],
    )}, ${outside.count} pixels`;
    return { rows: [], stable: false, drift: outside.max, driftAt: outside.at, masked: true, reason, targets: targets.length };
  }
  return { rows, stable: true, drift: outside.max, driftAt: outside.at, driftPixels: outside.count, targets: targets.length };
}

/* --------------------------------------------------------------- geometry */

/** The panel's published outline, or `null` when the page is not reporting one. */
export async function readPanelQuad(page) {
  const raw = await page.evaluate(() => document.querySelector(".asm")?.dataset.panelQuad ?? null);
  if (!raw) return null;
  const points = raw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .map(([x, y]) => ({ x, y }));
  if (points.length < 4 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
    return null;
  return points;
}

/** Every text element on screen that is a descendant of a chapter's body copy. */
export async function collectChapterCopy(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".asm-section__body")].flatMap((body) => {
      const chapter = body.closest("[data-assembly-section]")?.getAttribute("data-assembly-section") ?? "?";
      return [...body.querySelectorAll("h1,h2,h3,p,li,label,output,button,a,span,dt,dd,summary")]
        .filter((el) =>
          Array.from(el.childNodes).some((node) => node.nodeType === 3 && node.textContent.trim()),
        )
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            chapter,
            selector: `${el.tagName.toLowerCase()}.${String(el.className || "").split(/\s+/)[0] || "x"}`,
            text: (el.textContent || "").trim().slice(0, 42),
            box: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value)),
          };
        })
        .filter((row) => row.box[2] > 1 && row.box[3] > 1);
    }),
  );
}

/** Separating-axis test between a convex quad and an axis-aligned rectangle. */
export function quadRectOverlap(quad, rect) {
  const [x, y, w, h] = rect;
  if (!(w > 0) || !(h > 0)) return null;
  /* The intersection AREA of the two convex polygons, by clipping the text box
     against the projected panel outline. A separating-axis test answers a
     different question — it returns the smallest penetration depth, which for a
     box lying inside a thin quadrilateral is a handful of pixels, so a heading
     sitting on the instrument reports "17" and looks like a graze. Area is what
     "the text is on the panel" means. */
  let twiceArea = 0;
  for (let index = 0; index < quad.length; index++) {
    const a = quad[index];
    const b = quad[(index + 1) % quad.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  const sign = twiceArea >= 0 ? 1 : -1;
  let subject = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  for (let index = 0; index < quad.length && subject.length > 0; index++) {
    const a = quad[index];
    const b = quad[(index + 1) % quad.length];
    const side = (point) =>
      sign * ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x));
    const output = [];
    for (let vertex = 0; vertex < subject.length; vertex++) {
      const current = subject[vertex];
      const previous = subject[(vertex + subject.length - 1) % subject.length];
      const currentSide = side(current);
      const previousSide = side(previous);
      if (currentSide >= 0 !== previousSide >= 0) {
        const span = previousSide - currentSide;
        const t = span === 0 ? 0 : previousSide / span;
        output.push({
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
        });
      }
      if (currentSide >= 0) output.push(current);
    }
    subject = output;
  }
  if (subject.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < subject.length; index++) {
    const a = subject[index];
    const b = subject[(index + 1) % subject.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** Axis-aligned bounds of a quad, for containment checks. */
export function quadBounds(quad) {
  return {
    left: Math.min(...quad.map((point) => point.x)),
    top: Math.min(...quad.map((point) => point.y)),
    right: Math.max(...quad.map((point) => point.x)),
    bottom: Math.max(...quad.map((point) => point.y)),
  };
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function formatRow(row) {
  return `${row.chapter}/${row.selector} "${row.text}" ratio=${row.ratio?.toFixed(2) ?? "n/a"} ` +
    `(need ${row.threshold}) fg=${row.foreground?.join(",") ?? "?"} bg=${row.backdrop?.join(",") ?? "?"} box=${row.box.join(",")}`;
}
