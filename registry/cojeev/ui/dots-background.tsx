import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type DotsBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function DotsBackground(props: DotsBackgroundProps) {
  return <PatternBackground {...props} variant="dots" />;
}
