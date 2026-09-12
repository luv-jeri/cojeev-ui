import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type WeaveBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function WeaveBackground(props: WeaveBackgroundProps) {
  return <PatternBackground {...props} variant="weave" />;
}
