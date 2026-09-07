"use client";
import * as React from "react";
import { Preview } from "@/registry/sahajiv/ui/preview";
import { Label } from "@/registry/sahajiv/ui/label";
import { NativeSelect } from "@/registry/sahajiv/ui/native-select";
import { Button } from "@/registry/sahajiv/ui/button";
import { DocsMotion } from "@/components/docs-motion";
import { examples } from "@/components/examples";
export function ComponentPreview({
  id,
  variants,
  sizes,
  code,
}: {
  id: string;
  variants: string[];
  sizes: string[];
  code: Record<string, string>;
}) {
  const [variant, setVariant] = React.useState(variants[0] ?? "default");
  const [size, setSize] = React.useState(sizes[0] ?? "default");
  const [revision, setRevision] = React.useState(0);
  const controlId = React.useId();
  const Example = examples[id];
  if (!Example)
    throw new Error(`No live documentation example registered for ${id}`);
  return (
    <div className="docs-playground">
      <div className="docs-playground-controls">
        {variants.length > 1 && (
          <div className="docs-control">
            <Label htmlFor={`${controlId}-variant`} size="sm">Variant</Label>
            <NativeSelect id={`${controlId}-variant`} value={variant} onChange={(event) => setVariant(event.target.value)}>
              {variants.map((value) => <option key={value} value={value}>{value.replaceAll("-", " ")}</option>)}
            </NativeSelect>
          </div>
        )}
        {sizes.length > 1 && (
          <div className="docs-control">
            <Label htmlFor={`${controlId}-size`} size="sm">Size</Label>
            <NativeSelect id={`${controlId}-size`} value={size} onChange={(event) => setSize(event.target.value)}>
              {sizes.map((value) => <option key={value} value={value}>{({ default: "Default", xs: "Extra small", sm: "Small", md: "Medium", lg: "Large", xl: "Extra large" } as Record<string, string>)[value] ?? value}</option>)}
            </NativeSelect>
          </div>
        )}
        <div className="docs-playground-actions">
          <DocsMotion />
          <Button size="sm" variant="ghost" onClick={() => setRevision((value) => value + 1)}>Reset example</Button>
        </div>
      </div>
      <Preview code={code[`${variant}:${size}`]}>
        <div key={`${id}:${variant}:${size}:${revision}`} className="docs-specimen" data-example={id} data-variant={variant} data-size={size}>
          <Example variant={variant} size={size} />
        </div>
      </Preview>
    </div>
  );
}
