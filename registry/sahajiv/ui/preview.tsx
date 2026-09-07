"use client";
import * as React from "react";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Card } from "@/registry/sahajiv/ui/card";
import { CodeBlock, CopyButton } from "@/registry/sahajiv/ui/code-block";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/sahajiv/ui/tabs";
import { Title, BodySecondary } from "@/registry/sahajiv/ui/typography";
export type PreviewProps = React.ComponentProps<"section"> & {
  code: string;
  title?: string;
  description?: string;
};
export function Preview({
  children,
  code,
  title,
  description,
  className,
  ...props
}: PreviewProps) {
  return (
    <section
      data-slot="preview"
      className={cn("v-preview grid gap-[var(--s-4)] min-w-0", className)}
      {...props}
    >
      {title && <Title as="h3">{title}</Title>}
      {description && <BodySecondary>{description}</BodySecondary>}
      <Tabs defaultValue="preview" variant="underline">
        <div className="flex flex-wrap items-center justify-between gap-[var(--s-3)]">
          <TabsList aria-label={title ? `${title} view` : "Example view"}>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <CopyButton code={code}>
            Copy code
          </CopyButton>
        </div>
        <TabsContent value="preview">
          <Card
            variant="cream"
            className="v-preview__canvas"
            style={
              { "--muted-foreground": "var(--v-text-2)" } as React.CSSProperties
            }
          >
            {children}
          </Card>
        </TabsContent>
        <TabsContent value="code">
          <CodeBlock code={code} language="tsx" title="Example" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
