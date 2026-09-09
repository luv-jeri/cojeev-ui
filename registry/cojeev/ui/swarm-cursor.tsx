"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type SwarmCursorProps = ReferenceFieldProps;
/** A local flock of ink seeds follows the pointer and scatters on click. */
export function SwarmCursor(props: SwarmCursorProps) {
  return <ReferenceField {...props} kind="swarm-cursor" />;
}
