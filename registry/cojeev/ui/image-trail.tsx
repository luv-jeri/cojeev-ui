"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type ImageTrailProps = ReferenceFieldProps;
/** Distance-triggered image impressions fade behind the pointer. */
export function ImageTrail(props: ImageTrailProps) {
  return <ReferenceField {...props} kind="image-trail" />;
}
