import { Badge } from "@/registry/cojeev/ui/badge";
import { siteFlags } from "@/lib/site-config";

/**
 * Quiet build-time beta marker. Renders nothing outside a beta build.
 * `size="sm"` is deliberate: the `pills` morph selector excludes `.-sm`,
 * so this stamp never joins the organic-edge animation loop.
 */
export function BetaStamp({ environment = siteFlags.environment, className }: { environment?: string | null; className?: string }) {
  if (environment !== "beta") return null;
  return <Badge size="sm" variant="dashed" className={className} data-beta-stamp="">Beta</Badge>;
}
