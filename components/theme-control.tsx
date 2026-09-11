"use client";
import * as React from "react";
import { ThemeToggle } from "@/registry/cojeev/ui/theme-toggle";
import { applyTheme } from "@/registry/cojeev/motion/theme-transition";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import { Label } from "@/registry/cojeev/ui/label";
import { AppearanceMenu } from "@/registry/cojeev/ui/appearance";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/registry/cojeev/ui/tooltip";
type Theme = "light" | "dark";
const themeEvent = "cojeev-docs-theme-change";
let volatileTheme: Theme | null = null;
function readTheme(): Theme {
  if (volatileTheme) return volatileTheme;
  try {
    const stored = localStorage.getItem("cojeev-docs-theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function subscribeTheme(listener: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  function onStorage(event: StorageEvent) {
    if (event.key === "cojeev-docs-theme" || event.key === null) {
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
function useDocsTheme() {
  return React.useSyncExternalStore(
    subscribeTheme,
    readTheme,
    () => "light" as const,
  );
}
/** Theme lifetime follows the docs shell, not a conditionally mounted drawer. */
export function DocsThemeSync() {
  const mode = useDocsTheme();
  const {quiet}=useChoreography();
  const initialized=React.useRef(false);
  React.useEffect(() => {
    applyTheme(initialized.current ? mode : readTheme(), !initialized.current || quiet);
    initialized.current=true;
  }, [mode,quiet]);
  return null;
}
export function ThemeControl({ compact = false, iconOnly = false, navigation = false }: { compact?: boolean; iconOnly?: boolean; navigation?: boolean }) {
  const mode = useDocsTheme();
  const id = React.useId();
  return (
    <TooltipProvider><div className={`docs-theme${compact ? " docs-theme-compact" : ""}${iconOnly ? " docs-theme-icons" : ""}${navigation ? " docs-theme-navigation" : ""}`}>
      <Label htmlFor={id} size="sm" className={compact || iconOnly ? "sr-only" : undefined}>
        Appearance
      </Label>
      <Tooltip><TooltipTrigger asChild><ThemeToggle
        id={id}
        mode={mode}
        showLabel={navigation || (!compact && !iconOnly)}
        label={navigation ? "Theme" : undefined}
        onModeChange={(next) => {
          volatileTheme = next;
          try {
            localStorage.setItem("cojeev-docs-theme", next);
          } catch {}
          window.dispatchEvent(new Event(themeEvent));
        }}
      /></TooltipTrigger><TooltipContent>Switch to {mode === "dark" ? "light" : "dark"} theme</TooltipContent></Tooltip>
      <AppearanceMenu compact={iconOnly && !navigation} />
    </div></TooltipProvider>
  );
}
