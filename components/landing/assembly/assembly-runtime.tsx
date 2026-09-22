"use client";

/**
 * The stage: one fixed canvas, one scene controller, one lifecycle.
 *
 * Scroll never enters React. The subscription below pushes native scroll
 * straight into the controller and hands the projected Create measurement to the
 * seam channel, so a full-page scroll costs no re-render. Only two things reach
 * React state: the chapter being read, and the WebGL status — both change a
 * handful of times per visit.
 *
 * Three.js is imported inside the effect, so it never reaches the server bundle
 * and is never parsed by a visitor whose browser cannot render it.
 */
import * as React from "react";
import { CHAPTER_IDS, useScrollSample } from "./anchors";
import { writeSeam, writeFaces } from "./seam-bus";
import type { SceneController } from "./scene-controller";
import { experience, useExperienceValue, type WebglStatus } from "./experience-store";

type Props = {
  onChapter: (index: number) => void;
  onArrive: (index: number) => void;
  onStatus: (status: WebglStatus) => void;
};

export function AssemblyStage({ onChapter, onArrive, onStatus }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const controller = React.useRef<SceneController | null>(null);
  const latest = React.useRef<{ scrollY: number; viewportHeight: number } | null>(null);
  const chapter = React.useRef(-1);
  const arrived = React.useRef(-1);
  const handlers = React.useRef({ onChapter, onArrive, onStatus });

  // Read here rather than in the document: a contour drag then re-renders this
  // component, which draws one canvas, instead of six chapters of DOM.
  const contourPreset = useExperienceValue((value) => value.contourPreset);
  const contourAmount = useExperienceValue((value) => value.contourAmount);
  const contourColour = useExperienceValue((value) => value.contourColor);

  /* The controller is created inside a deferred dynamic import, so that closure
   * captures the contour as it stood when the effect first ran. Restoring a saved
   * contour, or a visitor moving the press, before the scene finishes loading would
   * then be overwritten by the captured defaults: the preview updated while the
   * sculpted object stayed at the authored default until some later edit happened
   * to change it. The boot reads this ref instead, so it always applies whatever is
   * current at the moment the controller actually exists. */
  const contourNow = React.useRef({ preset: contourPreset, amount: contourAmount, colour: contourColour });
  React.useEffect(() => {
    contourNow.current = { preset: contourPreset, amount: contourAmount, colour: contourColour };
  }, [contourPreset, contourAmount, contourColour]);

  // Effects run in declaration order, so the live callbacks are installed before
  // the subscription and the controller below can call them.
  React.useEffect(() => {
    handlers.current = { onChapter, onArrive, onStatus };
  }, [onChapter, onArrive, onStatus]);

  const { tops, version } = useScrollSample((sample) => {
    latest.current = { scrollY: sample.scrollY, viewportHeight: sample.viewportHeight };
    controller.current?.setScroll(sample.scrollY, sample.viewportHeight);
    if (sample.chapterIndex !== chapter.current) {
      chapter.current = sample.chapterIndex;
      handlers.current.onChapter(sample.chapterIndex);
    }
    if (sample.boundary === null && sample.chapterIndex !== arrived.current) {
      arrived.current = sample.chapterIndex;
      handlers.current.onArrive(sample.chapterIndex);
    }
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let instance: SceneController | null = null;

    void (async () => {
      /* The renderer is a deferred chunk, so its failure modes are real ones: a
       * blocked or 404'd module, a `createSceneController` that throws on an
       * unusual context, a browser that reports WebGL and then refuses it. Each of
       * those used to leave the status at "pending" forever, which shows as a
       * canvas that never appears and no explanation offered. Resolving to
       * `failed` here is what swaps in the static fallback. */
      let createSceneController: typeof import("./scene-controller")["createSceneController"];
      try {
        ({ createSceneController } = await import("./scene-controller"));
      } catch {
        if (!disposed) handlers.current.onStatus("failed");
        return;
      }
      if (disposed) return;
      try {
        instance = createSceneController({
          canvas,
          sectionTops: () => tops.current ?? [],
          onSeam: (sample) => { writeSeam(sample.create); writeFaces(sample.faces); },
          onChapter: (index) => {
            chapter.current = index;
            handlers.current.onChapter(index);
          },
          onStatus: (status) => {
            const mapped: WebglStatus =
              status === "unavailable"
                ? "unavailable"
                : status === "lost"
                  ? "failed"
                  : status === "ready"
                    ? "ready"
                    : "pending";
            if (mapped !== "ready") writeFaces(Object.fromEntries(["create", "switch", "slider", "layout", "content", "actions"].map(id => [id, null])));
            experience.set({ webgl: mapped });
            handlers.current.onStatus(mapped);
          },
        });
      } catch {
        if (!disposed) {
          experience.set({ webgl: "failed" });
          handlers.current.onStatus("failed");
        }
        return;
      }
      if (disposed) {
        instance?.dispose();
        return;
      }
      controller.current = instance;
      if (!instance) return;
      const boot = contourNow.current;
      instance.setContour(boot.preset, boot.amount, boot.colour);

      const current = latest.current;
      if (current) instance.setScroll(current.scrollY, current.viewportHeight);
    })();

    return () => {
      disposed = true;
      controller.current = null;
      instance?.dispose();
    };
    // One WebGL context per mount. Live props reach the controller through the
    // effects below instead of by re-creating the renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    controller.current?.setContour(contourPreset, contourAmount, contourColour);
  }, [contourPreset, contourAmount, contourColour]);

  // A re-measure means section offsets moved, so the renderer must re-read them.
  React.useEffect(() => {
    controller.current?.resize();
  }, [version]);

  return (
    <canvas
      ref={canvasRef}
      className="asm-canvas"
      aria-hidden="true"
      tabIndex={-1}
      data-chapters={CHAPTER_IDS.length}
    />
  );
}
