"use client";
import * as React from "react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/registry/sahajiv/ui/native-select";
import { Label } from "@/registry/sahajiv/ui/label";
type Theme = "light" | "dark";
const themeEvent = "sahajiv-docs-theme-change";
let volatileTheme: Theme | null = null;
function readTheme(): Theme {
  if (volatileTheme) return volatileTheme;
  try {
    const stored = localStorage.getItem("sahajiv-docs-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function subscribeTheme(listener: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  function onStorage(event: StorageEvent) {
    if (event.key === "sahajiv-docs-theme" || event.key === null) {
      volatileTheme = null;
      listener();
    }
  }
  window.addEventListener(themeEvent, listener);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener(themeEvent, listener);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", listener);
  };
}
export function ThemeControl() {
  const mode = React.useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "light" as const,
  );
  const id = React.useId();
  React.useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  return (
    <div className="docs-theme">
      <Label htmlFor={id} size="sm">
        Appearance
      </Label>
      <NativeSelect
        id={id}
        value={mode}
        onChange={(event) => {
          const next = event.target.value as Theme;
          volatileTheme = next;
          try {
            localStorage.setItem("sahajiv-docs-theme", next);
          } catch {}
          window.dispatchEvent(new Event(themeEvent));
        }}
      >
        <NativeSelectOption value="light">Light</NativeSelectOption>
        <NativeSelectOption value="dark">Dark</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
