import type React from "react";

export type FixtureProps = Record<string, unknown>;
export type ConvertOptions = {
  skipInteractive?: boolean;
  skipComposed?: boolean;
  Component?: React.ElementType;
  props?: FixtureProps;
  children?: React.ReactNode;
};
export type FixtureContext = {
  id: string;
  state: string;
  fixture: Document;
  props: (node: Element) => FixtureProps;
  convert: (
    node: Node,
    index?: number,
    options?: ConvertOptions,
  ) => React.ReactNode;
  children: (node: Node) => React.ReactNode[];
  mark: (node: Element) => void;
};

/** Keep fixture content and identities; remove only attributes owned by the stateful API. */
export function omit(props: FixtureProps, ...names: string[]): FixtureProps {
  const result = { ...props };
  for (const name of names) delete result[name];
  return result;
}
export function textValue(node: Element): string {
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
export function localDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(+match[1], +match[2] - 1, +match[3]) : undefined;
}
