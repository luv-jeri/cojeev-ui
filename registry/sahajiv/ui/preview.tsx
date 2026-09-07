"use client";
import * as React from "react";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Card } from "@/registry/sahajiv/ui/card";
import { Button } from "@/registry/sahajiv/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/sahajiv/ui/tabs";
import { Title, BodySecondary, Meta } from "@/registry/sahajiv/ui/typography";
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
  const [status, setStatus] = React.useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Copy unavailable. Select the code and copy it manually.");
    }
  }
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
          <Button size="sm" variant="ghost" onClick={copy}>
            Copy code
          </Button>
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
          <pre className="v-preview__code" tabIndex={0}>
            <code>{code}</code>
          </pre>
        </TabsContent>
      </Tabs>
      <Meta role="status" aria-live="polite">
        {status}
      </Meta>
    </section>
  );
}
