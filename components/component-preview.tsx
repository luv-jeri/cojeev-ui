"use client";
import * as React from "react";
import { Preview } from "@/registry/cojeev/ui/preview";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Meta } from "@/registry/cojeev/ui/typography";
import { DocsMotion } from "@/components/docs-motion";
import { examples } from "@/components/examples";
import { ComponentHandoff } from "@/components/component-handoff";
import { AnalyticsPreview } from "@/components/analytics/analytics-preview";
import { sanitizeRoute, track } from "@/lib/analytics/client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/registry/cojeev/ui/select";
import {
  controlRadiusStyle,
  type ControlRadius,
} from "@/registry/cojeev/lib/control-appearance";
import type { ExampleProps } from "@/components/examples/types";
const fieldGuidance: Record<string, [string, string]> = {
  contour: [
    "Compact forms that need clear boundaries.",
    "Focus, edit and clear the entry.",
  ],
  editorial: [
    "Writing tasks that need room to breathe.",
    "Edit the open-line field.",
  ],
  inset: [
    "Grouped details that belong in one place.",
    "Edit the value inside the labelled well.",
  ],
};
const sliderGuidance: Record<string, [string, string]> = {
  organic: [
    "An everyday value with a soft response.",
    "Drag and reverse direction.",
  ],
  rubber: [
    "An expressive measure of tension or intensity.",
    "Stretch it to thin the middle; shorten it to thicken.",
  ],
  line: [
    "A restrained setting in a dense interface.",
    "Use the arrow keys for precise steps.",
  ],
  segmented: [
    "A small set of meaningful levels.",
    "Move between the marked stops.",
  ],
  range: [
    "Two limits defining one interval.",
    "Adjust each endpoint independently.",
  ],
  vertical: [
    "A level alongside other vertical controls.",
    "Drag up or use the up arrow.",
  ],
};
const chartGuidance: Record<string, [string, string]> = {
  analysis: [
    "Explore a complete plot and compare series.",
    "Toggle a legend item or inspect the plot with the arrow keys.",
  ],
  brief: [
    "Lead with a named source measure and its supporting plot.",
    "Change the dataset; the measure stays independent of legend filters.",
  ],
  ledger: [
    "Read the graphic beside its exact source values.",
    "Inspect the plot and scroll the values without leaving the comparison.",
  ],
};
export function ComponentPreview({
  id,
  variants,
  sizes,
  code,
  handoffNotes,
}: {
  id: string;
  variants: string[];
  sizes: string[];
  code: { source: string; name: string };
  handoffNotes?: string;
}) {
  const visibleVariants = [...new Set(variants)];
  const visibleSizes = [...new Set(sizes)];
  const [variant, setVariant] = React.useState(visibleVariants[0] ?? "default");
  const [size, setSize] = React.useState(visibleSizes[0] ?? "default");
  const [radius, setRadius] = React.useState<ControlRadius | "default">(
    "default",
  );
  const [glyphShape, setGlyphShape] =
    React.useState<NonNullable<ExampleProps["shape"]>>("organic");
  const [selectedMark, setSelectedMark] = React.useState<
    NonNullable<ExampleProps["indicator"]> | "none"
  >("auto");
  const choiceControl = ["checkbox", "radio-group", "questionnaire"].includes(
    id,
  );
  const [tone, setTone] =
    React.useState<NonNullable<ExampleProps["tone"]>>("default");
  const formComposition = [
    "field",
    "input-group",
    "textarea",
    "multi-select",
    "select",
    "native-select",
    "number-input",
  ].includes(id);
  const [wheelSide, setWheelSide] = React.useState<"left" | "right">("left");
  const [alertTone, setAlertTone] =
    React.useState<NonNullable<ExampleProps["alertTone"]>>("info");
  const [progressAppearance, setProgressAppearance] =
    React.useState<NonNullable<ExampleProps["progressAppearance"]>>("auto");
  const [progressSurface, setProgressSurface] =
    React.useState<NonNullable<ExampleProps["progressSurface"]>>("default");
  const [placeholderEffect, setPlaceholderEffect] =
    React.useState<NonNullable<ExampleProps["placeholderEffect"]>>("shimmer");
  const [spinnerShape, setSpinnerShape] =
    React.useState<NonNullable<ExampleProps["spinnerShape"]>>("soft");
  const [avatarShape, setAvatarShape] =
    React.useState<NonNullable<ExampleProps["avatarShape"]>>("circle");
  const [avatarAccent, setAvatarAccent] =
    React.useState<NonNullable<ExampleProps["avatarAccent"]>>("pink");
  const [badgeTreatment, setBadgeTreatment] =
    React.useState<NonNullable<ExampleProps["badgeTreatment"]>>("pink");
  const [adornment, setAdornment] =
    React.useState<NonNullable<ExampleProps["adornment"]>>("none");
  const [fieldAppearance, setFieldAppearance] =
    React.useState<NonNullable<ExampleProps["fieldAppearance"]>>("default");
  const fieldSurface =
    fieldAppearance === "default"
      ? variant === "integrated"
        ? "inset"
        : "contour"
      : fieldAppearance;
  const borderlessField =
    id === "input"
      ? variant === "editorial"
      : formComposition && fieldSurface === "editorial";
  const chartModes: Record<string, string[]> = {
    "area-chart": ["linear", "step", "stacked"],
    "bar-chart": ["grouped", "stacked", "horizontal"],
    "line-chart": ["linear", "smooth", "step"],
    "pie-chart": ["pie", "donut"],
    "radar-chart": ["polygon", "rounded", "grid"],
    "radial-chart": ["full", "semicircle"],
  };
  const [chartMode, setChartMode] = React.useState(
    chartModes[id]?.[0] ?? "linear",
  );
  const choiceProps = choiceControl
    ? {
        shape: glyphShape,
        indicator: selectedMark === "none" ? ("auto" as const) : selectedMark,
        showIndicator: selectedMark !== "none",
      }
    : {};
  const [revision, setRevision] = React.useState(0);
  const Example = examples[id];
  const guidance =
    id === "input"
      ? fieldGuidance
      : chartModes[id]
        ? chartGuidance
        : id === "slider"
          ? sliderGuidance
          : {};
  const radiusStyle = controlRadiusStyle(
    radius === "default" ? undefined : radius,
  );
  const radiusValue = (radiusStyle as Record<string, string> | undefined)?.[
    "--v-control-radius"
  ];
  const feedbackCode =
    id === "alert"
      ? ` alertTone="${alertTone}"`
      : id === "progress"
        ? ` progressAppearance="${progressAppearance}" progressSurface="${progressSurface}"`
        : id === "skeleton"
          ? ` placeholderEffect="${placeholderEffect}"`
          : id === "spinner"
            ? ` spinnerShape="${spinnerShape}"`
            : id === "avatar"
              ? ` avatarShape="${avatarShape}" avatarAccent="${avatarAccent}"`
              : id === "badge"
                ? ` badgeTreatment="${badgeTreatment}"`
                : "";
  const exampleCode = `<${code.name}${variant !== "default" ? ` variant="${variant}"` : ""}${size !== "default" ? ` size="${size}"` : ""}${choiceControl ? ` shape="${glyphShape}" indicator="${choiceProps.indicator}" showIndicator={${choiceProps.showIndicator}}` : ""}${id === "card" ? ` tone="${tone}"` : ""}${chartModes[id] ? ` chartMode="${chartMode}"` : ""}${formComposition ? ` fieldAppearance="${fieldAppearance}"` : ""}${id === "multi-select" ? ` adornment="${adornment}"` : ""}${id === "option-wheel" ? ` wheelSide="${wheelSide}"` : ""}${feedbackCode} />`;
  const selectedCode = `${code.source.trimEnd()}\n\nexport default function Demo() {\n  return (\n    ${radiusValue ? `<div style={{ ["--v-control-radius" as string]: "${radiusValue}" }}>\n      ${exampleCode}\n    </div>` : exampleCode}\n  );\n}\n`;
  if (!Example)
    throw new Error(`No live documentation example registered for ${id}`);
  const compactGallery = [
    "button",
    "hero-button",
    "agent-state",
    "marker",
    "icon",
    "animated-icon",
    "toggle",
    "theme-toggle",
  ].includes(id);
  const actions = (
    <>
      <DocsMotion />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setRevision((value) => value + 1)}
      >
        <AnimatedIcon name="refresh-cw" size="sm" aria-hidden="true" />
        Reset example
      </Button>
    </>
  );
  const currentRoute = () => sanitizeRoute(window.location.pathname);
  const label = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
  const configurableRadius =
    !borderlessField &&
    ([
      "button",
      "input",
      "card",
      "field",
      "input-group",
      "textarea",
      "date-picker",
      "select",
      "native-select",
      "number-input",
      "multi-select",
      "switch",
      "questionnaire",
      "alert",
      "badge",
      "toggle",
      "item",
    ].includes(id) ||
      (choiceControl && (variant === "card" || variant === "chip")));
  const choice = (
    name: string,
    value: string,
    values: string[],
    change: (value: string) => void,
  ) => (
    <label className="docs-workbench-choice">
      <span>{name}</span>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          change(nextValue);
          const route = currentRoute();
          if (route && (name === "Approach" || name === "Size")) {
            track("variant_selected", {
              component_id: id,
              placement: "docs",
              route,
              variant_id: name === "Approach" ? "variant" : "size",
              variant_value: nextValue,
            });
          }
        }}
      >
        <SelectTrigger aria-label={`Example ${name.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {label(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
  const controls =
    visibleVariants.length > 1 ||
    visibleSizes.length > 1 ||
    configurableRadius ? (
      <div className="docs-workbench-controls">
        <div className="docs-workbench-choices">
          {visibleVariants.length > 1 &&
            choice("Approach", variant, visibleVariants, setVariant)}
          {visibleSizes.length > 1 &&
            choice("Size", size, visibleSizes, setSize)}
          {id === "avatar" && (
            <>
              {choice(
                "Avatar shape",
                avatarShape,
                ["circle", "rounded", "pebble"],
                (value) =>
                  setAvatarShape(
                    value as NonNullable<ExampleProps["avatarShape"]>,
                  ),
              )}
              {choice(
                "Avatar accent",
                avatarAccent,
                ["default", "pink", "yellow", "olive", "blue", "ink"],
                (value) =>
                  setAvatarAccent(
                    value as NonNullable<ExampleProps["avatarAccent"]>,
                  ),
              )}
            </>
          )}
          {id === "badge" &&
            choice(
              "Badge treatment",
              badgeTreatment,
              [
                "default",
                "pink",
                "yellow",
                "olive",
                "blue",
                "ink",
                "cream",
                "pink-soft",
                "yellow-soft",
                "olive-soft",
                "blue-soft",
                "danger",
              ],
              (value) =>
                setBadgeTreatment(
                  value as NonNullable<ExampleProps["badgeTreatment"]>,
                ),
            )}
          {chartModes[id] &&
            choice("Chart mode", chartMode, chartModes[id], setChartMode)}
          {id === "skeleton" &&
            choice(
              "Placeholder effect",
              placeholderEffect,
              ["shimmer", "pulse", "ink"],
              (value) =>
                setPlaceholderEffect(
                  value as NonNullable<ExampleProps["placeholderEffect"]>,
                ),
            )}
          {id === "spinner" &&
            variant === "bloom" &&
            choice("Seed shape", spinnerShape, ["soft", "point"], (value) =>
              setSpinnerShape(
                value as NonNullable<ExampleProps["spinnerShape"]>,
              ),
            )}
          {id === "alert" &&
            choice(
              "Message status",
              alertTone,
              ["default", "info", "ok", "warn", "danger", "pink"],
              (value) =>
                setAlertTone(value as NonNullable<ExampleProps["alertTone"]>),
            )}
          {id === "progress" && (
            <>
              {choice(
                "Track shape",
                progressAppearance,
                ["auto", "organic", "line", "segmented", "orbit"],
                (value) =>
                  setProgressAppearance(
                    value as NonNullable<ExampleProps["progressAppearance"]>,
                  ),
              )}
              {choice(
                "Track surface",
                progressSurface,
                ["default", "cream"],
                (value) =>
                  setProgressSurface(
                    value as NonNullable<ExampleProps["progressSurface"]>,
                  ),
              )}
            </>
          )}
          {id === "option-wheel" &&
            choice("Wheel side", wheelSide, ["left", "right"], (value) =>
              setWheelSide(value as "left" | "right"),
            )}
          {id === "multi-select" &&
            choice(
              "Item art",
              adornment,
              ["none", "icon-only", "blob-only", "both"],
              (value) =>
                setAdornment(value as NonNullable<ExampleProps["adornment"]>),
            )}
          {formComposition &&
            choice(
              "Field surface",
              fieldAppearance,
              ["default", "contour", "editorial", "inset"],
              (value) =>
                setFieldAppearance(
                  value as NonNullable<ExampleProps["fieldAppearance"]>,
                ),
            )}
          {id === "card" &&
            choice(
              "Surface",
              tone,
              [
                "default",
                "pink",
                "yellow",
                "olive",
                "blue",
                "ink",
                "cream",
                "featured",
                "panel",
                "lift",
              ],
              (value) => setTone(value as NonNullable<ExampleProps["tone"]>),
            )}
          {choiceControl &&
            choice(
              "Glyph shape",
              glyphShape,
              ["organic", "circle", "rounded", "pebble", "leaf", "flower"],
              (value) =>
                setGlyphShape(value as NonNullable<ExampleProps["shape"]>),
            )}
          {choiceControl &&
            choice(
              "Selected mark",
              selectedMark,
              ["auto", "dot", "check", "diamond", "flower", "none"],
              (value) => setSelectedMark(value as typeof selectedMark),
            )}
          {configurableRadius &&
            choice(
              choiceControl ? "Container corners" : "Corners",
              radius,
              ["default", "square", "soft", "round", "pill"],
              (value) => setRadius(value as ControlRadius | "default"),
            )}
        </div>
        <Meta>
          {choiceControl
            ? "Glyph shape changes the selector; Approach changes the layout. Your selections stay put. Copy includes these settings."
            : "Change the example. Copy takes these settings with it."}
        </Meta>
      </div>
    ) : undefined;
  const specimen = (
    specimenVariant: string,
    specimenSize: string,
    compact = false,
  ) => (
    <div
      className="docs-specimen"
      data-example={id}
      data-variant={specimenVariant}
      data-size={specimenSize}
      data-example-role={compact ? "gallery" : "interactive"}
    >
      <React.Suspense fallback={<Meta role="status">Loading preview…</Meta>}>
        <Example
          variant={specimenVariant}
          size={specimenSize}
          compact={compact}
          {...choiceProps}
          {...(id === "card" ? { tone } : {})}
          {...(chartModes[id] ? { chartMode } : {})}
          {...(formComposition ? { fieldAppearance } : {})}
          {...(id === "multi-select" ? { adornment } : {})}
          {...(id === "option-wheel" ? { wheelSide } : {})}
          {...(id === "alert" ? { alertTone } : {})}
          {...(id === "skeleton" ? { placeholderEffect } : {})}
          {...(id === "spinner" ? { spinnerShape } : {})}
          {...(id === "avatar" ? { avatarShape, avatarAccent } : {})}
          {...(id === "badge" ? { badgeTreatment } : {})}
          {...(id === "progress"
            ? { progressAppearance, progressSurface }
            : {})}
        />
      </React.Suspense>
    </div>
  );
  return (
    <div className="docs-playground">
      <AnalyticsPreview componentId={id} placement="docs">
        <Preview
          code={selectedCode}
          actions={actions}
          controls={controls}
          onPatternChange={(value) => {
            const route = currentRoute();
            if (route)
              track("variant_selected", {
                component_id: id,
                placement: "docs",
                route,
                variant_id: "preview_background",
                variant_value: value,
              });
          }}
          onCopyResult={(result) => {
            const route = currentRoute();
            if (!route) return;
            if (result === "success")
              track("source_copied", { component_id: id, route });
            else
              track("copy_failed", {
                component_id: id,
                route,
                copy_kind: "source",
              });
          }}
          defaultPattern={
            id.endsWith("-background") || id === "pigment-field"
              ? "none"
              : "dots"
          }
        >
          <div
            key={`${id}:${revision}`}
            className="docs-preview-stack"
            style={radiusStyle}
          >
            {specimen(variant, size)}
            {visibleVariants.length > 1 && (
              <section className="docs-specimen-section" aria-label="Variants">
                <div className="docs-specimen-heading">
                  <h3>Variants</h3>
                  <Meta>Compare each treatment. Every example is live.</Meta>
                </div>
                <div
                  className="docs-specimen-gallery"
                  data-compact={compactGallery}
                >
                  {visibleVariants.map((value) => (
                    <figure key={value}>
                      <figcaption>
                        <span>{label(value)}</span>
                        {guidance[value] && (
                          <p className="docs-specimen-guidance">
                            <b>Use when:</b> {guidance[value][0]} <b>Try:</b>{" "}
                            {guidance[value][1]}
                          </p>
                        )}
                      </figcaption>
                      {specimen(value, size, true)}
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </div>
        </Preview>
      </AnalyticsPreview>
      {handoffNotes && (
        <ComponentHandoff
          notes={handoffNotes}
          code={selectedCode}
          variant={variant}
          size={size}
          componentId={id}
        />
      )}
    </div>
  );
}
