"use client";

import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
  ToastIndicator,
} from "@/registry/cojeev/ui/toast";
import type { ExampleProps } from "./types";

export function ToastExample({ variant = "compact" }: ExampleProps) {
  const appearance =
    variant === "actionable" || variant === "receipt" ? variant : "compact";
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [undone, setUndone] = React.useState(false);
  return (
    <ToastProvider>
      <div className="v-toast-demo">
        <Button
          onClick={() => {
            setSaved(true);
            setUndone(false);
            setOpen(true);
          }}
        >
          Save example note
        </Button>
        <span className="v-toast-demo__status" role="status">
          {saved
            ? "Example note saved on this page."
            : undone
              ? "Save undone. Your example note is not saved."
              : "No example note saved."}
        </span>
        <Toast
          appearance={appearance}
          variant="cream"
          durable
          open={open}
          onOpenChange={setOpen}
        >
          <ToastIndicator />
          <ToastTitle>
            {appearance === "receipt"
              ? "A little thought, kept."
              : "Note saved"}
          </ToastTitle>
          {appearance !== "compact" && (
            <ToastDescription>
              {appearance === "receipt"
                ? "Field notes.md"
                : "One small thought is ready for you to return to."}
            </ToastDescription>
          )}
          {appearance === "receipt" && (
            <div className="v-toast__receipt">
              <span>
                Destination<strong>Personal notebook</strong>
              </span>
              <span>
                Storage<strong>Local example only</strong>
              </span>
            </div>
          )}
          {appearance === "actionable" && (
            <ToastAction
              altText="Undo saving this example note"
              onClick={() => {
                setSaved(false);
                setUndone(true);
              }}
            >
              Undo
            </ToastAction>
          )}
          <ToastClose aria-label="Dismiss notification" />
        </Toast>
        <ToastViewport className="v-toast-demo__viewport" />
      </div>
    </ToastProvider>
  );
}
