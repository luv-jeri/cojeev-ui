"use client";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
export function InstallCommand({ command }: { command: string }) {
  return <CodeBlock className="docs-command" code={command} language="Terminal" copyLabel="Copy command" />;
}
