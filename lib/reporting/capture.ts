export type Crop = { x: number; y: number; width: number; height: number };
/** A rectangle of the current view, in viewport CSS pixels. */
export type CaptureArea = { x: number; y: number; width: number; height: number };
export type CapturePhase = "preparing" | "reading" | "assets" | "rendering" | "ready";
/** `current`/`total` count embedded assets only; no phase reports whole-operation progress. */
export type CaptureProgress = { phase: CapturePhase; current?: number; total?: number };
export type CaptureOptions = { area?: CaptureArea; signal?: AbortSignal; onProgress?: (progress: CaptureProgress) => void };
export class CaptureCancelled extends Error { constructor() { super("Screenshot cancelled."); this.name = "CaptureCancelled"; } }
const CAPTURE_DEADLINE = 60000;
const privateSelector = "input,textarea,select,[contenteditable],[data-private]";
const chromeSelector = "[data-reporting-chrome],nextjs-portal,[data-slot=sheet-overlay],[data-slot=motion-drawer-content],[data-slot=motion-drawer-overlay]";
export function captureDimensions(mode: "viewport" | "page", width: number, documentHeight: number, viewportHeight: number) {
  const height = mode === "viewport" ? viewportHeight : Math.max(documentHeight, viewportHeight);
  if (width * height > 32000000 || height > 20000) throw new Error("This page is too large to capture. Attach a screenshot from your device instead.");
  return { width, height };
}
/** Rounds a drawn or typed rectangle to whole pixels and refuses anything that cannot be rendered. */
export function captureArea(area: CaptureArea, viewportWidth: number, viewportHeight: number): CaptureArea {
  const values = [area.x, area.y, area.width, area.height];
  if (!values.every(value => Number.isFinite(value))) throw new Error("That area is not a usable rectangle. Draw it again.");
  const x = Math.round(area.x), y = Math.round(area.y), width = Math.round(area.width), height = Math.round(area.height);
  if (width < 1 || height < 1) throw new Error("That area is too small to capture. Draw a larger rectangle.");
  if (x < 0 || y < 0 || x + width > Math.round(viewportWidth) || y + height > Math.round(viewportHeight)) throw new Error("Keep the area inside the visible part of the page.");
  return { x, y, width, height };
}
/** Lets the browser paint the capture status before the main thread is held by cloning. */
const paint = () => new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
/**
 * modern-screenshot measures default styles in a sandbox iframe it makes on first use, reading its
 * `contentDocument.body` right after assigning `srcdoc` — and while that navigation commits the
 * document has no body, so a clone that yields into the window measures against null. This frame
 * is written in place and never navigated, so the body is there wherever the clone yields.
 */
function captureSandbox(): HTMLIFrameElement {
  const sandbox = document.createElement("iframe");
  sandbox.id = "__SANDBOX__report-capture";
  // Capture chrome, so the measuring frame is filtered out of the screenshot like the drawer is.
  sandbox.setAttribute("data-reporting-chrome", "");
  sandbox.width = "0"; sandbox.height = "0";
  sandbox.style.visibility = "hidden"; sandbox.style.position = "fixed";
  document.body.appendChild(sandbox);
  // Nothing owns the frame until it is handed to the context, so its own failure has to clear it.
  try {
    const sandboxDocument = sandbox.contentDocument;
    // Standards mode, matching the document the library would have navigated to.
    sandboxDocument?.open(); sandboxDocument?.write('<!DOCTYPE html><meta charset="UTF-8"><title></title><body>'); sandboxDocument?.close();
    if (!sandboxDocument?.body) throw new Error("Your browser blocked the frame this screenshot needs. Attach an image instead.");
  } catch (cause) { sandbox.remove(); throw cause; }
  return sandbox;
}
export async function capturePage(mode: "viewport" | "page", options: CaptureOptions = {}): Promise<File> {
  if (location.pathname.includes("feedback-admin")) throw new Error("Capture is unavailable on private reports.");
  const report = options.onProgress ?? (() => {});
  // A render that outruns the deadline is marked failed, not merely raced: every clone,
  // embed and progress callback reads this flag, so the losing work stops cloning and
  // stops reporting instead of running on after the context is destroyed.
  let failure: Error | null = null;
  const halted = () => !!failure || !!options.signal?.aborted;
  const stop = () => { if (options.signal?.aborted) throw new CaptureCancelled(); if (failure) throw failure; };
  report({ phase: "preparing" });
  stop();
  const viewportWidth = document.documentElement.clientWidth;
  // The whole view is rendered and then cropped, so an area keeps the page's own layout and styling.
  const area = options.area ? captureArea(options.area, viewportWidth, innerHeight) : null;
  const { width, height } = captureDimensions(mode, viewportWidth, document.documentElement.scrollHeight, innerHeight);
  const offsetX = mode === "viewport" ? scrollX : 0, offsetY = mode === "viewport" ? scrollY : 0;
  const { createContext, destroyContext, domToCanvas } = await import("modern-screenshot");
  stop();
  await paint();
  let cloned = 0;
  // autoDestruct is off so the sandbox iframe and workers are released on cancel and on failure too.
  const context = await createContext(document.documentElement, {
    width, height, scale: 1, maximumCanvasSize: 20000, timeout: 8000, autoDestruct: false,
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    style: mode === "viewport" ? { transform: `translate(${-offsetX}px, ${-offsetY}px)`, transformOrigin: "top left" } : undefined,
    filter: node => !(node instanceof Element && (node.closest(chromeSelector) || node.closest(privateSelector))),
    fetch: { requestInit: { credentials: "omit", referrerPolicy: "no-referrer" } },
    progress: (current, total) => { if (total && !halted()) report({ phase: "assets", current: Math.min(current, total), total }); },
    onCloneEachNode: async node => {
      stop();
      if (node instanceof HTMLElement) {
        if (node.matches(privateSelector)) { node.textContent = ""; node.style.visibility = "hidden"; node.removeAttribute("value"); }
        if (mode === "viewport" && node.style.position === "fixed") node.style.transform = `translate(${offsetX}px, ${offsetY}px) ${node.style.transform === "none" ? "" : node.style.transform}`;
      }
      // Cloning a large page holds the main thread; yield often enough that Cancel stays clickable.
      if (++cloned % 200 === 0) { report({ phase: "reading" }); await paint(); stop(); }
    },
    onEmbedNode: () => { stop(); report({ phase: "rendering" }); },
  });
  let expire = () => {};
  // Promise.race keeps its own handler on this promise, so a late rejection is never unhandled.
  const expired = new Promise<never>((_, reject) => { expire = () => { failure ??= new Error("This screenshot took too long to render. Try a smaller area."); reject(failure); }; });
  const deadline = setTimeout(expire, CAPTURE_DEADLINE);
  try {
    stop();
    // Given a settled sandbox the library never creates — and never immediately uses — its own.
    context.sandbox = captureSandbox();
    report({ phase: "reading" });
    const canvas = await Promise.race([domToCanvas(context), expired]);
    stop();
    const file = await canvasFile(area ? cropCanvas(canvas, area) : canvas, area ? "area-screenshot.png" : mode === "page" ? "page-screenshot.png" : "viewport-screenshot.png");
    // A cancel during the final encode must not hand back an attachment.
    stop();
    report({ phase: "ready" });
    return file;
  } finally { clearTimeout(deadline); destroyContext(context); }
}
function cropCanvas(canvas: HTMLCanvasElement, area: CaptureArea): HTMLCanvasElement {
  const cropped = document.createElement("canvas"); cropped.width = area.width; cropped.height = area.height;
  const context = cropped.getContext("2d"); if (!context) throw new Error("Your browser could not render this screenshot. Attach a file instead.");
  context.drawImage(canvas, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return cropped;
}
export async function cropImage(file: File, crop: Crop): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const x = Math.round(bitmap.width * crop.x / 100), y = Math.round(bitmap.height * crop.y / 100);
    const width = Math.max(1, Math.round(bitmap.width * crop.width / 100)), height = Math.max(1, Math.round(bitmap.height * crop.height / 100));
    if (x < 0 || y < 0 || x + width > bitmap.width + 1 || y + height > bitmap.height + 1) throw new Error("Keep the crop within the image.");
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser could not crop this image.");
    context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
    return canvasFile(canvas, "cropped-screenshot.png");
  } finally { bitmap.close(); }
}
function canvasFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], name, { type: "image/png" })) : reject(new Error("Could not render this screenshot. Attach a file instead.")), "image/png"));
}
