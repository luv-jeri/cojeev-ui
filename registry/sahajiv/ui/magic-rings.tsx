"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type MagicRingsProps = ReferenceFieldProps;
/** Concentric open rings expand through the SahaJiv palette. */
export function MagicRings(props: MagicRingsProps) {
  return <ReferenceField {...props} kind="magic-rings" />;
}
