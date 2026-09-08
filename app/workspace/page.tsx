import type { Metadata } from "next";
import Link from "next/link";
import { AgentWorkspaceExample } from "@/components/examples/agent";
import { Breadcrumb, BreadcrumbLink, BreadcrumbList, BreadcrumbItem } from "@/registry/sahajiv/ui/breadcrumb";
import { ThemeControl } from "@/components/theme-control";
import "./workspace.css";

export const metadata: Metadata = { title: "Agent workspace · SahaJiv UI", description: "An interactive monitoring workspace built with SahaJiv UI components." };

export default function WorkspacePage() {
  return <main className="workspace-page">
    <div className="workspace-page__nav"><Breadcrumb aria-label="Workspace demo navigation"><BreadcrumbList><BreadcrumbItem><BreadcrumbLink asChild><Link href="/docs/agent-chat/">← Agent chat documentation</Link></BreadcrumbLink></BreadcrumbItem></BreadcrumbList></Breadcrumb><ThemeControl /></div>
    <AgentWorkspaceExample />
  </main>;
}
