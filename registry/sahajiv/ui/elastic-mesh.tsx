"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "../lib/reference-field";
export type ElasticMeshProps = ReferenceFieldProps;
/** A textured spring mesh yields to the pointer and settles back. */
export function ElasticMesh(props: ElasticMeshProps) {
  return <ReferenceField {...props} kind="elastic-mesh" />;
}
