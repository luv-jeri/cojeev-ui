"use client";
import * as React from "react";
import { Preview } from "@/registry/sahajiv/ui/preview";
import { Label } from "@/registry/sahajiv/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/registry/sahajiv/ui/select";
import { Button } from "@/registry/sahajiv/ui/button";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { MotionPresence, MotionSurface } from "@/registry/sahajiv/ui/presence";
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
  code: { source: string; name: string };
}) {
  const [variant, setVariant] = React.useState(variants[0] ?? "default");
  const [size, setSize] = React.useState(sizes[0] ?? "default");
  const [revision, setRevision] = React.useState(0);
  const controlId = React.useId();
  const Example = examples[id];
  const selectedCode = `${code.source}\n\nexport default function Demo() {\n  return (\n    <${code.name}${variant !== "default" ? ` variant="${variant}"` : ""}${size !== "default" ? ` size="${size}"` : ""} />\n  );\n}\n`;
  if (!Example)
    throw new Error(`No live documentation example registered for ${id}`);
  const hasVariantControls = variants.length > 1 || sizes.length > 1;
  const actions = (
    <div className="docs-playground-actions">
      <DocsMotion />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setRevision((value) => value + 1)}
      >
        Reset example
      </Button>
    </div>
  );
  const controls = hasVariantControls ? (
    <div className="docs-playground-controls">
      <div className="docs-variant-controls">
        {variants.length > 1 && (
          <div className="docs-control">
            <Label htmlFor={`${controlId}-variant`} size="sm">Variant</Label>
            <Select value={variant} onValueChange={setVariant}>
              <SelectTrigger id={`${controlId}-variant`} className="docs-preview-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {variants.map(value => <SelectItem key={value} value={value} adornmentId={`variant:${value}`}>{value.replaceAll("-", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {sizes.length > 1 && (
          <div className="docs-control">
            <Label htmlFor={`${controlId}-size`} size="sm">Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id={`${controlId}-size`} className="docs-preview-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sizes.map(value => <SelectItem key={value} value={value} adornmentId={`size:${value}`}>
                  {({ default: "Default", xs: "Extra small", sm: "Small", md: "Medium", lg: "Large", xl: "Extra large" } as Record<string,string>)[value] ?? value}
                </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {actions}
    </div>
  ) : undefined;
  return (
    <div className="docs-playground">
      <Preview
        code={selectedCode}
        controls={controls}
        actions={hasVariantControls ? undefined : actions}
      >
        <MotionPresence initial mode="wait">
        <MotionSurface
          preset="rise"
          key={`${id}:${variant}:${size}:${revision}`}
          className="docs-specimen"
          data-example={id}
          data-variant={variant}
          data-size={size}
        >
          <React.Suspense fallback={<Meta role="status">Loading preview…</Meta>}>
            <Example variant={variant} size={size} />
          </React.Suspense>
        </MotionSurface>
        </MotionPresence>
      </Preview>
    </div>
  );
}
