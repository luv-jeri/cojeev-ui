import type * as React from "react";
import type {
  ControlRadius,
  FieldAppearance,
} from "@/registry/cojeev/lib/control-appearance";
export type ExampleProps = {
  variant?: string;
  size?: string;
  compact?: boolean;
  radius?: ControlRadius;
  fieldAppearance?: FieldAppearance | "default";
  adornment?: "both" | "icon-only" | "blob-only" | "none";
  shape?: "organic" | "rounded" | "circle" | "pebble" | "leaf" | "flower";
  indicator?: "auto" | "dot" | "check" | "diamond" | "flower";
  showIndicator?: boolean;
  chartMode?: string;
  wheelSide?: "left" | "right";
  alertTone?: "default" | "info" | "ok" | "warn" | "danger" | "pink";
  progressAppearance?: "auto" | "organic" | "line" | "segmented" | "orbit";
  progressSurface?: "default" | "cream";
  placeholderEffect?: "shimmer" | "pulse" | "ink";
  spinnerShape?: "soft" | "point";
  avatarShape?: "circle" | "rounded" | "pebble";
  avatarAccent?: "default" | "pink" | "yellow" | "olive" | "blue" | "ink";
  badgeTreatment?:
    | "default"
    | "pink"
    | "yellow"
    | "olive"
    | "blue"
    | "ink"
    | "cream"
    | "pink-soft"
    | "yellow-soft"
    | "olive-soft"
    | "blue-soft"
    | "danger";
  tone?:
    | "default"
    | "pink"
    | "yellow"
    | "olive"
    | "blue"
    | "ink"
    | "cream"
    | "featured"
    | "panel"
    | "lift";
};
export type ExampleComponent = React.ComponentType<ExampleProps>;
