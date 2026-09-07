"use client";
import * as React from "react";
import { Button } from "@/registry/sahajiv/ui/button";
import { Meta } from "@/registry/sahajiv/ui/typography";
export function InstallCommand({command}:{command:string}) {
  const [status,setStatus] = React.useState("");
  return <div className="docs-command"><pre tabIndex={0}><code>{command}</code></pre><Button size="sm" variant="secondary" onClick={async () => {
    try { await navigator.clipboard.writeText(command); setStatus("Copied install command."); }
    catch { setStatus("Copy unavailable. Select the command and copy it manually."); }
  }}>Copy command</Button><Meta role="status">{status}</Meta></div>;
}
