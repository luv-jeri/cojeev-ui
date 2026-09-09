"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type RippleDistortionProps = ReferenceFieldProps;
/** Expanding waves displace a texture through a triangulated surface. */
export function RippleDistortion(props: RippleDistortionProps) {
  return <ReferenceField {...props} kind="ripple-distortion" />;
}
