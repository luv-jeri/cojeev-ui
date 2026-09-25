import registry from "@/registry.json";
import type { Metadata } from "next";
import { AssemblyLanding } from "@/components/landing/assembly/assembly-landing";
import { pageMetadata } from "@/lib/site-config";
import "@/components/landing/assembly/assembly.css";

/**
 * The assembly, at its own address.
 *
 * The home page and every existing landing component are deliberately untouched:
 * this route carries the whole piece so it can be reviewed at 1536x1024 and
 * 390x844 on its own terms before it is linked from anywhere else. It is
 * `noindex` and absent from the primary navigation, which is a staging decision
 * rather than a statement about the work.
 */
export const metadata: Metadata = {
  ...pageMetadata(
    "The assembly",
    "Expressive React components. Explore a playful assembly, try real components, and make their source your own.",
    "/assembly/",
  ),
  robots: { index: false, follow: false },
};

export default function AssemblyPage() {
  return <AssemblyLanding componentCount={registry.items.filter((entry) => entry.type === "registry:ui").length} />;
}
