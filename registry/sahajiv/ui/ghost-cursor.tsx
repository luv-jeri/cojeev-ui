"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type GhostCursorProps = ReferenceFieldProps;
/** An inertial translucent ink trail follows the local pointer. */
export function GhostCursor(props: GhostCursorProps) {
  return <ReferenceField {...props} kind="ghost-cursor" />;
}
