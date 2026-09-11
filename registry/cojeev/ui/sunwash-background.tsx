import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type SunwashBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function SunwashBackground(props: SunwashBackgroundProps) {
  return <PatternBackground {...props} variant="sunwash" />;
}
