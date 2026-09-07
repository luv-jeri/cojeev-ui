"use client";
import { Preview } from "@/registry/sahajiv/ui/preview";
import { Meta } from "@/registry/sahajiv/ui/typography";
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
  const Example = examples[id];
  if (!Example)
    throw new Error(`No live documentation example registered for ${id}`);
  return (
    <div className="docs-variant">
      {[...new Set(variants)].map((variant) => (
        <Preview
          key={variant}
          title={variant === "default" ? "Default" : variant}
          code={code[variant]}
        >
          <div className="docs-size">
            {[...new Set(sizes)].map((size) => (
              <div
                key={size}
                className="docs-size"
                data-example={id}
                data-variant={variant}
                data-size={size}
              >
                {sizes.length > 1 && (
                  <Meta>
                    {size === "default" ? "Default size" : `Size: ${size}`}
                  </Meta>
                )}
                <Example variant={variant} size={size} />
              </div>
            ))}
          </div>
        </Preview>
      ))}
    </div>
  );
}
