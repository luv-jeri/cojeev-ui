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
