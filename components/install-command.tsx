"use client";

import { useState } from "react";
import { Button } from "@/registry/sahajiv/ui/button";

export function InstallCommand({ command }: { command: string }) {
  const [status, setStatus] = useState("");
  return <div>
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-fd-muted-foreground">Terminal</span>
      <Button variant="secondary" size="sm" onClick={async () => {
        try { await navigator.clipboard.writeText(command); setStatus("Copied install command."); }
        catch { setStatus("Clipboard unavailable. Select and copy the command below."); }
      }}>Copy command</Button>
    </div>
    <pre tabIndex={0} aria-label="Install command"><code>{command}</code></pre>
    <p role="status" className="text-sm">{status}</p>
  </div>;
}
