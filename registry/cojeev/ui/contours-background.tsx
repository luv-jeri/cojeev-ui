import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type ContoursBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function ContoursBackground(props: ContoursBackgroundProps) {
  return <PatternBackground {...props} variant="contours" />;
}
