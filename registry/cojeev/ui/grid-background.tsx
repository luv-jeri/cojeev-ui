import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type GridBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function GridBackground(props: GridBackgroundProps) {
  return <PatternBackground {...props} variant="grid" />;
}
