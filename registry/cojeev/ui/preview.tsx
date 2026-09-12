"use client";
import * as React from "react";
import { cn } from "@/registry/cojeev/lib/utils";
import { CodeBlock, CopyButton } from "@/registry/cojeev/ui/code-block";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { PreviewBackgroundPaint, type PreviewBackgroundVariant } from "../lib/preview-backgrounds";
export type { PreviewBackgroundVariant } from "../lib/preview-backgrounds";
import { PreviewBackgroundPicker } from "../lib/preview-background-picker";
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
  /** Optional controls shown with the live specimen. */
  controls?: React.ReactNode;
  /** Optional actions beside the view switcher. */
  actions?: React.ReactNode;
  /** Controlled background. Without onPatternChange the background is fixed. */
  pattern?: PreviewBackgroundVariant;
  /** Initial background for an uncontrolled preview. */
  defaultPattern?: PreviewBackgroundVariant;
  onPatternChange?: (pattern: PreviewBackgroundVariant) => void;
  showBackgroundPicker?: boolean;
  /** Reports the source copy outcome without coupling the registry to analytics. */
  onCopyResult?: (result: "success" | "failure") => void;
};
export function Preview({
  children,
  code,
  title,
  description,
  controls,
  actions,
  pattern,
  defaultPattern = "dots",
  onPatternChange,
  showBackgroundPicker = true,
  onCopyResult,
  className,
  ...props
}: PreviewProps) {
  const [localPattern, setLocalPattern] = React.useState(defaultPattern);
  const [view, setView] = React.useState("preview");
  const selectedPattern = pattern ?? localPattern;
  const changePattern = (next: PreviewBackgroundVariant) => {
    if (pattern === undefined) setLocalPattern(next);
    onPatternChange?.(next);
  };
  return (
    <section
      data-slot="preview"
      className={cn("v-preview", className)}
      {...props}
    >
      {title && <Title as="h3">{title}</Title>}
      {description && <BodySecondary>{description}</BodySecondary>}
      <Tabs value={view} onValueChange={setView} variant="pills" className="v-preview__frame">
        <div className="v-preview__toolbar">
          <TabsList aria-label={title ? `${title} view` : "Example view"}>
            <TabsTrigger value="preview"><AnimatedIcon name="eye" size="sm" aria-hidden="true" />Preview</TabsTrigger>
            <TabsTrigger value="code"><AnimatedIcon name="code" size="sm" aria-hidden="true" />Code</TabsTrigger>
          </TabsList>
          <div className="v-preview__actions" role="group" aria-label="Example tools">
            {showBackgroundPicker && <PreviewBackgroundPicker value={selectedPattern} onChange={changePattern} disabled={view !== "preview" || (pattern !== undefined && !onPatternChange)} />}
            {actions}
          </div>
          <CopyButton code={code} onCopyResult={onCopyResult}>Copy code</CopyButton>
        </div>
        <TabsContent value="preview" forceMount hidden={view !== "preview"} className="v-preview__panel">
          {controls && <div className="v-preview__controls">{controls}</div>}
          <div
            data-slot="preview-canvas"
            className="v-preview__canvas"
            style={
              { "--muted-foreground": "var(--v-text-2)" } as React.CSSProperties
            }
          >
            <PreviewBackgroundPaint value={selectedPattern} />
            {children}
          </div>
        </TabsContent>
        <TabsContent value="code" forceMount hidden={view !== "code"} className="v-preview__panel">
          <CodeBlock embedded code={code} language="tsx" title="Example" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
