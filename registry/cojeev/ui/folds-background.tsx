import { PatternBackground, type PatternBackgroundProps } from "./pattern-background";

export type FoldsBackgroundProps = Omit<PatternBackgroundProps, "variant">;

export function FoldsBackground(props: FoldsBackgroundProps) {
  return <PatternBackground {...props} variant="folds" />;
}
