"use client";
import * as React from "react";
import { NativeSelect, NativeSelectOption } from "@/registry/sahajiv/ui/native-select";
import { Label } from "@/registry/sahajiv/ui/label";
export function ThemeControl() {
  const [mode, setMode] = React.useState("light");
  const id = React.useId();
  React.useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("sahajiv-docs-theme"); } catch {}
    const next = stored === "dark" || stored === "light" ? stored : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.mode = next; setMode(next);
  }, []);
  return <div className="docs-theme"><Label htmlFor={id} size="sm">Appearance</Label><NativeSelect id={id} value={mode} onChange={event => {
    const next = event.target.value; setMode(next); document.documentElement.dataset.mode = next;
    try { localStorage.setItem("sahajiv-docs-theme", next); } catch {}
  }}><NativeSelectOption value="light">Light</NativeSelectOption><NativeSelectOption value="dark">Dark</NativeSelectOption></NativeSelect></div>;
}
