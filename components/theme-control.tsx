"use client";
import * as React from "react";
import { ThemeToggle } from "@/registry/sahajiv/ui/theme-toggle";
import { applyTheme } from "@/registry/sahajiv/motion/theme-transition";
import { useChoreography } from "@/registry/sahajiv/motion/choreography";
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
  const {quiet}=useChoreography();
  const initialized=React.useRef(false);
  React.useEffect(() => {
    applyTheme(mode,!initialized.current||quiet);
    initialized.current=true;
  }, [mode,quiet]);
  return (
    <div className="docs-theme">
      <Label htmlFor={id} size="sm">
        Appearance
      </Label>
      <ThemeToggle
        id={id}
        mode={mode}
        onModeChange={(next) => {
          volatileTheme = next;
          try {
            localStorage.setItem("sahajiv-docs-theme", next);
          } catch {}
          window.dispatchEvent(new Event(themeEvent));
        }}
      />
    </div>
  );
}
