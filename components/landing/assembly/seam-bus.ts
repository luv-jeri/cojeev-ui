/**
 * The seam channel.
 *
 * The projected Create control is measured by the scene controller and painted
 * by a DOM node owned by `CreateSeam`. Those two live in different component
 * trees, and the measurement changes on every frame of scroll — far too often to
 * route through React state, and too hot to write into a ref handed across a
 * component boundary.
 *
 * So the element registers a writer here, the stage calls it with a measurement,
 * and nothing re-renders. One writer at a time: mounting a second Create control
 * replaces the first rather than leaving two live seams.
 */
import type { SeamRect } from "./scene-controller";

export type SeamWriter = (rect: SeamRect | null) => void;

/** Smallest registered face worth aiming a finger at, in CSS pixels. */
export const MIN_TOUCH = 44;

let writer: SeamWriter | null = null;

export function registerSeamWriter(next: SeamWriter | null) {
  writer = next;
}

export function writeSeam(rect: SeamRect | null) {
  writer?.(rect);
}

/** Writes a measurement onto a plate element. Whole pixels: measurable, not eyeballed. */
export function paintSeam(plate: HTMLElement, rect: SeamRect | null) {
  if (!rect) {
    plate.style.transform = "";
    plate.style.width = "";
    plate.style.height = "";
    plate.dataset.measured = "false";
    return;
  }
  /* The plate centres its child, so growing the box to meet the touch floor moves
   * the button's centre DOWN by half the growth. A 161x24 projection — the real
   * contour object's box — therefore sat its button 10px below the pill it is
   * supposed to be drawn on. The box is grown symmetrically instead: the same
   * height, shifted up by half the clamp, so the button's centre still lands on
   * the projected centre. */
  const height = Math.max(MIN_TOUCH, rect.height);
  const centreOffset = (height - rect.height) / 2;
  plate.style.transform = `translate3d(${Math.round(rect.x)}px, ${Math.round(
    rect.y - centreOffset,
  )}px, 0) rotate(${rect.angle.toFixed(4)}rad)`;
  plate.style.width = `${rect.width.toFixed(2)}px`;
  plate.style.height = `${height.toFixed(2)}px`;
  plate.dataset.measured = "true";
}

const faces = new Map<string, SeamWriter>();
const latestFaces = new Map<string, SeamRect | null>();
export function registerFace(id: string, writer: SeamWriter | null) {
  if (writer) {
    faces.set(id, writer);
    writer(latestFaces.get(id) ?? null);
  } else faces.delete(id);
}
export function writeFaces(next: Record<string, SeamRect | null>) {
  for (const [id, rect] of Object.entries(next)) {
    latestFaces.set(id, rect);
    faces.get(id)?.(rect);
  }
}
export function faceRect(id: string) {
  return latestFaces.get(id) ?? null;
}
export function paintFace(node: HTMLElement, rect: SeamRect | null) {
  if (!rect?.matrix) {
    node.dataset.measured = "false";
    node.style.cssText = "";
    return;
  }
  node.dataset.measured = "true";
  const matrix = [...rect.matrix];
  if (window.innerWidth < 900) {
    matrix[1] += window.scrollY * matrix[3];
    matrix[5] += window.scrollY * matrix[7];
    matrix[13] += window.scrollY;
  }
  node.style.transform = `matrix3d(${matrix.join(",")})`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  node.style.setProperty(
    "--touch-y",
    `${Math.max(0, (48 - rect.height) / 2)}px`,
  );
  /* The plate's width, for the faces that carry three things rather than one.
   * A drawer plate is 89px wide at 390 and 131px at 1024; a label sized from the
   * height alone overflows those by 8px and takes the chevron off the plate. */
  node.style.setProperty("--face-width", `${rect.width}px`);
  node.style.setProperty("--face-font", `${Math.min(30, rect.height * 0.3)}px`);
  node.style.setProperty("--face-angle", `${rect.angle}rad`);
}

/**
 * Publishes the sculpted panel's projected outline on the page root.
 *
 * The panel has no DOM node of its own — it is WebGL geometry, and the one
 * thing that decides whether chapter copy over it stays readable is where its
 * silhouette actually lands on screen. Writing the four projected corners here
 * makes that measurable from outside the page, in the same units as the text
 * boxes it has to be compared against, and it is the same kind of published
 * state as `data-webgl` and `data-chapter` rather than a second source of truth:
 * the numbers come straight from the controller's own projection.
 *
 * Formatted as `x,y x,y x,y x,y`, or removed when the panel has no honest
 * outline to report (behind the eye plane, or wholly off screen).
 */
export function writePanelQuad(rect: SeamRect | null) {
  const shell = document.querySelector<HTMLElement>(".asm");
  if (!shell) return;
  const corners = rect?.corners;
  if (!corners || corners.length < 4) {
    if (shell.dataset.panelQuad !== undefined) delete shell.dataset.panelQuad;
    return;
  }
  const next = corners
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  if (shell.dataset.panelQuad !== next) shell.dataset.panelQuad = next;
}
