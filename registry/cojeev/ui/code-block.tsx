"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/registry/cojeev/ui/button";
import { Meta } from "@/registry/cojeev/ui/typography";
import { cn } from "@/registry/cojeev/lib/utils";

/** The fallback stays inside the control's tree, including a modal focus scope. */
function copyWithSelection(code: string, trigger: HTMLButtonElement): boolean {
  const document = trigger.ownerDocument;
  const active = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) =>
        selection.getRangeAt(i).cloneRange(),
      )
    : [];
  const field =
    active?.tagName === "INPUT" || active?.tagName === "TEXTAREA"
      ? (active as HTMLInputElement | HTMLTextAreaElement)
      : null;
  const fieldSelection = field && field.selectionStart !== null
    ? [field.selectionStart, field.selectionEnd, field.selectionDirection ?? undefined] as const
    : null;
  const view = document.defaultView;
  const scroll = view ? { x: view.scrollX, y: view.scrollY } : null;
  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("data-copy-fallback", "");
  textarea.style.cssText = "position:fixed;inset-block-start:0;inset-inline-start:-9999px;width:1px;height:1px;padding:0;border:0;font-size:16px;opacity:0;";
  (trigger.parentElement ?? document.body).append(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, code.length);
    return typeof document.execCommand === "function" && document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (active?.isConnected) active.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
    // Document selection restoration can reset a focused input's native range.
    if (field?.isConnected && fieldSelection) {
      field.setSelectionRange(...fieldSelection);
    }
    if (view && scroll) view.scrollTo(scroll.x, scroll.y);
  }
}

async function copyText(code: string, trigger: HTMLButtonElement): Promise<boolean> {
  try {
    const clipboard = trigger.ownerDocument.defaultView?.navigator.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(code);
      return true;
    }
  } catch {
    // An unavailable or denied Clipboard API can still allow a user-initiated copy.
  }
  return copyWithSelection(code, trigger);
}

export type CopyButtonProps = ButtonProps & { code: string };

/** Copies exactly `code`; success is reported only after a copy mechanism succeeds. */
export function CopyButton({
  code,
  children,
  className,
  size = "sm",
  variant = "ghost",
  disabled,
  onClick,
  ...props
}: CopyButtonProps) {
  const [result, setResult] = React.useState<{
    code: string;
    state: "copying" | "copied" | "error";
  } | null>(null);
  const pending = React.useRef(false);
  const statusId = React.useId();
  const state = result?.code === code ? result.state : "idle";
  return (
    <span data-slot="copy-control" className="v-copy-control">
      <Button
        {...props}
        type="button"
        data-slot="copy-button"
        className={className}
        size={size}
        variant={variant}
        disabled={disabled}
        aria-disabled={disabled || state === "copying" || props["aria-disabled"]}
        aria-describedby={[props["aria-describedby"], statusId].filter(Boolean).join(" ")}
        aria-busy={state === "copying" || undefined}
        onClick={async (event) => {
          onClick?.(event);
          if (event.defaultPrevented || pending.current) return;
          const trigger = event.currentTarget;
          pending.current = true;
          setResult({ code, state: "copying" });
          let copied = false;
          try {
            copied = await copyText(code, trigger);
          } catch {
            // Preserve manual copying if the browser rejects both mechanisms.
          } finally {
            pending.current = false;
            setResult({ code, state: copied ? "copied" : "error" });
          }
        }}
      >
        {children ?? (state === "copied" ? "Copied" : state === "copying" ? "Copying…" : "Copy")}
      </Button>
      <Meta as="span" id={statusId} role="status" aria-live="polite" data-copy-state={state}>
        {state === "copied"
          ? "Copied to clipboard."
          : state === "error"
            ? "Copy unavailable. Select the text and copy it manually."
            : ""}
      </Meta>
    </span>
  );
}

export type CodeBlockProps = Omit<React.ComponentProps<"figure">, "children" | "title"> & {
  code: string;
  language?: string;
  title?: string;
  wrap?: boolean;
  copyLabel?: string;
};

/** A plain-text code surface. `language` labels the source; it does not fake highlighting. */
export function CodeBlock({
  code,
  language,
  title,
  wrap = false,
  copyLabel,
  className,
  ...props
}: CodeBlockProps) {
  return (
    <figure
      {...props}
      data-slot="code-block"
      data-wrap={wrap || undefined}
      className={cn("v-code-block", className)}
    >
      <figcaption data-slot="code-block-header">
        <span data-slot="code-block-label">
          {title && <span data-slot="code-block-title">{title}</span>}
          {language && <Meta as="span">{language}</Meta>}
        </span>
        <CopyButton code={code}>{copyLabel}</CopyButton>
      </figcaption>
      <pre tabIndex={0} aria-label={title ? `${title} source code` : "Source code"}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
