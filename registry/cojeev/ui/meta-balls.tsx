"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type MetaBallsProps = ReferenceFieldProps;
/** Moving scalar-field bodies meet in true liquid joins. */
export function MetaBalls(props: MetaBallsProps) {
  return <ReferenceField {...props} kind="meta-balls" />;
}
