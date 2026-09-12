"use client";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import { sanitizeRoute, track } from "@/lib/analytics/client";
export function InstallCommand({ command, componentId }: { command: string; componentId?: string }) {
  return <CodeBlock
    className="docs-command"
    code={command}
    variant="terminal"
    title="Terminal"
    copyLabel="Copy command"
    onCopyResult={(result) => {
      const route = sanitizeRoute(window.location.pathname);
      if (!route) return;
      if (result === "success") {
        track("install_command_copied", { route, ...(componentId ? { component_id: componentId } : {}) });
      } else {
        track("copy_failed", { route, copy_kind: "install_command", ...(componentId ? { component_id: componentId } : {}) });
      }
    }}
  />;
}
