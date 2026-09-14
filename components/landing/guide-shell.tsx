import { MarketingHeader, MarketingFooter } from "./marketing-shell";
import { Hero, Body, Meta } from "@/registry/cojeev/ui/typography";

export function GuideShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <div className="story-page"><MarketingHeader /><main id="story-main" className="launch-guide">
    <header><Meta>{eyebrow}</Meta><Hero>{title}</Hero><Body>{intro}</Body></header>
    <div className="launch-prose">{children}</div>
  </main><MarketingFooter /></div>;
}
