import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type SproutsBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function SproutsBackground(props: SproutsBackgroundProps) {
  return <PatternBackground {...props} variant="sprouts" />;
}
