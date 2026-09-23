"use client";

/**
 * The contour press.
 *
 * A site-only tool, and labelled as one: it edits the silhouette language the
 * shape chapter shows and exports it as an SVG or a React component, but no
 * installable registry API is involved and nothing is added to the catalogue.
 *
 * The preview and the sculpted face read the same blend: what is exported is
 * what is on screen. Both the preset choice and the amount are ordinary form
 * controls with visible labels, so the whole tool is usable without the canvas.
 */
import * as React from "react";
import {
  CONTOUR_COLORS,
  experience,
  storeContour,
  type ContourColor,
} from "./experience-store";
import {
  CONTOUR_LABELS,
  contourLabel,
  CONTOUR_PRESETS,
  blendContour,
  contourFileName,
  contourPath,
  contourReactComponent,
  contourSvgDocument,
  type ContourPreset,
} from "./contour-export";
import { PALETTE } from "./canonical";

const DOWNLOAD = (name: string, text: string, type: string) => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ContourEditor() {
  const preset = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourPreset,
    () => "daisy-12" as ContourPreset,
  );
  const amount = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourAmount,
    () => 0,
  );
  const color = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourColor,
    () => "yellow" as ContourColor,
  );
  const [status, setStatus] = React.useState("");

  const values = React.useMemo(() => blendContour(preset, amount), [preset, amount]);
  const path = React.useMemo(() => contourPath(values), [values]);
  const fill = PALETTE[color];

  const set = React.useCallback((patch: { preset?: ContourPreset; amount?: number }) => {
    const mapped: Partial<{ contourPreset: ContourPreset; contourAmount: number }> = {};
    if (patch.preset !== undefined) mapped.contourPreset = patch.preset;
    if (patch.amount !== undefined) mapped.contourAmount = patch.amount;
    experience.set(mapped);
    const next = experience.get();
    storeContour(next.contourPreset, next.contourAmount, next.contourColor);
    experience.emit({ type: "contourChange", amount: next.contourAmount });
  }, []);

  const onExportSvg = React.useCallback(() => {
    DOWNLOAD(
      contourFileName({ preset, amount }),
      contourSvgDocument({ preset, amount, fill, title: "000h contour" }),
      "image/svg+xml",
    );
    experience.emit({ type: "exported" });
    experience.announce("Contour exported as SVG");
    setStatus("Exported SVG");
  }, [amount, fill, preset]);

  const onExportComponent = React.useCallback(() => {
    DOWNLOAD(
      contourFileName({ preset, amount }).replace(/\.svg$/, ".tsx"),
      contourReactComponent({ preset, amount, fill }),
      "text/plain",
    );
    experience.emit({ type: "exported" });
    experience.announce("Contour exported as a React component");
    setStatus("Exported component");
  }, [amount, fill, preset]);

  return (
    <div className="asm-contour">
      <div className="asm-contour__preview">
        <svg viewBox="0 0 100 100" role="img" aria-label={`Contour preview: ${contourLabel(preset)}, ${Math.round(amount)} percent blended`}>
          <path d={path} fill={fill} />
        </svg>
      </div>

      <div className="asm-contour__controls">
        <fieldset className="asm-field">
          <legend className="asm-field__label">Silhouette</legend>
          <div className="asm-field__choices">
            {CONTOUR_PRESETS.map((option) => (
              <button
                key={option}
                type="button"
                className="asm-chip"
                aria-pressed={option === preset}
                onClick={() => {
                  set({ preset: option });
                  /* Picking a silhouette is a selection, not a commit: the commit
                   * cue belongs to the shape actually becoming the object. */
                  experience.emit({ type: "shapeSelect", id: option });
                }}
              >
                {CONTOUR_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="asm-field">
          <label className="asm-field__label" htmlFor="asm-contour-amount">
            Blend toward cushion
          </label>
          <input
            id="asm-contour-amount"
            className="asm-range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(amount)}
            onChange={(event) => set({ amount: Number(event.target.value) })}
          />
          <output className="asm-field__value" htmlFor="asm-contour-amount">
            {Math.round(amount)}%
          </output>
        </div>

        <fieldset className="asm-field">
          <legend className="asm-field__label">Tone</legend>
          <div className="asm-field__choices">
            {CONTOUR_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                className="asm-swatch"
                style={{ background: PALETTE[option] }}
                aria-label={option}
                aria-pressed={option === color}
                onClick={() => {
                  experience.set({ contourColor: option });
                  /* Persisted here as well as on the preset and amount: the tone
                   * changed what the preview, the sculpted face and the export all
                   * show, so it belongs in the same saved record. */
                  const next = experience.get();
                  storeContour(next.contourPreset, next.contourAmount, next.contourColor);
                  experience.emit({ type: "shapeCommit" });
                  experience.announce(`${option} contour tone applied`);
                }}
              />
            ))}
          </div>
        </fieldset>

        <div className="asm-field__row">
          <button type="button" className="asm-link" onClick={onExportSvg}>
            Export SVG
          </button>
          <button type="button" className="asm-link" onClick={onExportComponent}>
            Export React component
          </button>
        </div>

        <p className="asm-field__note" role="status">
          {status ||
            "Exports use the same blend the sculpted face is built from. This tool is site-only: nothing here is part of an installable component."}
        </p>
      </div>
    </div>
  );
}

/** The canonical path shown alongside the editor, so the export is inspectable. */
export function ContourSource() {
  const preset = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourPreset,
    () => "daisy-12" as ContourPreset,
  );
  const amount = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourAmount,
    () => 0,
  );
  const color = React.useSyncExternalStore(
    experience.subscribe,
    () => experience.get().contourColor,
    () => "yellow" as ContourColor,
  );
  /* The tone is read from the same store value the export and the sculpted face
   * use. Hard-coding `PALETTE.yellow` here made this viewer disagree with the
   * file the visitor actually downloads the moment they chose another tone. */
  const code = React.useMemo(
    () => contourReactComponent({ preset, amount, fill: PALETTE[color] }),
    [preset, amount, color],
  );
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="asm-source">
      <pre className="asm-source__code" tabIndex={0}>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className="asm-link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            experience.emit({ type: "copy" });
            experience.announce("Contour source copied");
          } catch {
            experience.emit({ type: "copyFailed", what: "contour source" });
            experience.announce("Copy failed. The source is shown above and can be selected.");
          }
        }}
      >
        {copied ? "Copied" : "Copy source"}
      </button>
    </div>
  );
}
