import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type PebblesBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function PebblesBackground(props: PebblesBackgroundProps) {
  return <PatternBackground {...props} variant="pebbles" />;
}
