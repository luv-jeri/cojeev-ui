"use client";
import * as React from "react";
import { cn } from "@/registry/cojeev/lib/utils";
import { Card } from "@/registry/cojeev/ui/card";
import { CodeBlock, CopyButton } from "@/registry/cojeev/ui/code-block";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/cojeev/ui/tabs";
import { Title, BodySecondary } from "@/registry/cojeev/ui/typography";
export type PreviewProps = React.ComponentProps<"section"> & {
  code: string;
  title?: string;
  description?: string;
  /** Variant selectors or other controls shown with the live specimen. */
  controls?: React.ReactNode;
  /** Optional actions beside the view switcher. */
  actions?: React.ReactNode;
};
export function Preview({
  children,
  code,
  title,
  description,
  controls,
  actions,
  className,
  ...props
}: PreviewProps) {
  return (
    <section
      data-slot="preview"
      className={cn("v-preview", className)}
      {...props}
    >
      {title && <Title as="h3">{title}</Title>}
      {description && <BodySecondary>{description}</BodySecondary>}
      <Tabs defaultValue="preview" variant="underline" className="v-preview__frame">
        <div className="v-preview__toolbar">
          <TabsList aria-label={title ? `${title} view` : "Example view"}>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <div className="v-preview__actions">
            {actions}
            <CopyButton code={code}>Copy code</CopyButton>
          </div>
        </div>
        <TabsContent value="preview" className="v-preview__panel">
          {controls && <div className="v-preview__controls">{controls}</div>}
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
        <TabsContent value="code" className="v-preview__panel">
          <CodeBlock code={code} language="tsx" title="Example" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
