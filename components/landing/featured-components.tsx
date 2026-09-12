"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { Shape } from "@/registry/cojeev/ui/shape";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Dock } from "@/registry/cojeev/ui/dock";
import { AgentState, type AgentStatus } from "@/registry/cojeev/ui/agent-state";
import { PatternBackground, type PatternBackgroundVariant } from "@/registry/cojeev/ui/pattern-background";
import { Meta } from "@/registry/cojeev/ui/typography";
import type { SemanticBloomControls } from "@/registry/cojeev/ui/semantic-bloom";
import { InstallCommand } from "@/components/install-command";
import { AnalyticsPreview } from "@/components/analytics/analytics-preview";
import { installCommand } from "@/lib/site-config";
import { sanitizeRoute, track } from "@/lib/analytics/client";

const SemanticBloom = dynamic(() => import("@/registry/cojeev/ui/semantic-bloom").then(module => module.SemanticBloom), {
  loading: () => <div className="launch-preview-loading" role="status">A little life is loading…</div>,
});

function BloomPreview() {
  const controls = React.useRef<SemanticBloomControls | null>(null);
  return <div className="launch-bloom" data-example="semantic-bloom">
    <SemanticBloom text="000h" size={1.3} controlsRef={controls} seed={17} />
    <div className="launch-demo-tools">
      <Button variant="ghost" size="sm" onClick={() => controls.current?.gather()}>Gather</Button>
      <Button variant="ghost" size="sm" onClick={() => controls.current?.scatter()}>Scatter</Button>
    </div>
  </div>;
}

function IconPreview() {
  const [replay, setReplay] = React.useState(0);
  return <div className="launch-icons" data-example="animated-icon">
    <div className="launch-icon-family" key={replay}>
      {(["heart", "sparkles", "bell"] as const).map(name => <span key={name}><AnimatedIcon name={name} preset="draw" active size="lg" /></span>)}
    </div>
    <Button variant="secondary" size="sm" onClick={() => setReplay(value => value + 1)}><AnimatedIcon name="refresh-cw" /> Replay the details</Button>
  </div>;
}

function DrawerPreview() {
  return <div className="launch-drawer" data-example="motion-drawer">
    <div className="launch-paper-stack" aria-hidden="true"><span /><span /><span><Shape name="clover-soft" /></span></div>
    <MotionDrawer title="A little room for ideas" description="Real components, ready for your own content." variant="stack" triggerLabel="Open drawer" panels={[
      { value: "idea", label: "The idea", children: <div className="launch-drawer-content"><Shape name="clover-soft" /><p>A place for a thought, a task, or your next good idea. Switch between the files to try the stack.</p></div> },
      { value: "details", label: "The details", children: <div className="launch-drawer-content"><p>Keyboard navigation, focus return, and motion preferences are part of the experience. Try Escape to return to the page.</p><Button asChild><Link href="/docs/motion-drawer/">Explore Motion Drawer</Link></Button></div> },
      { value: "yours", label: "Make it yours", children: <div className="launch-install-details"><p>A little stack for settings, notes, or something entirely your own.</p><InstallCommand command={installCommand("motion-drawer")} componentId="motion-drawer" /></div> },
    ]} />
  </div>;
}

function recordVariant(componentId: string, value: string, variantId: "variant" | "preview_background" = "variant") {
  const route = sanitizeRoute(window.location.pathname);
  if (route) track("variant_selected", { component_id: componentId, placement: "landing", route, variant_id: variantId, variant_value: value });
}

const dockItems = [
  { value: "notes", label: "Notes", icon: <Icon name="file-text" /> },
  { value: "files", label: "Files", icon: <Icon name="folder" /> },
  { value: "ideas", label: "Ideas", icon: <Icon name="sparkles" /> },
  { value: "settings", label: "Settings", icon: <Icon name="settings" /> },
];
function DockPreview() {
  const [selected, setSelected] = React.useState("notes");
  return <div className="launch-dock-demo" data-example="dock">
    <p className="launch-dock-selection" role="status">{dockItems.find(item => item.value === selected)?.label}</p>
    <Dock items={dockItems} value={selected} onValueChange={setSelected} variant="shelf" itemSize={38} magnification={1.35} aria-label="Try the dock" />
  </div>;
}

function AgentPreview() {
  const [status, setStatus] = React.useState<AgentStatus>("thinking");
  return <div className="launch-agent-demo" data-example="agent-state">
    <AgentState status={status} size="sm" />
    <div className="launch-choices" role="group" aria-label="Try an agent state">
      {([['thinking', 'Think'], ['working', 'Work'], ['complete', 'Done']] as const).map(([value, label]) => <Button key={value} variant={status === value ? "secondary" : "ghost"} size="sm" aria-pressed={status === value} onClick={() => { setStatus(value); recordVariant("agent-state", value); }}>{label}</Button>)}
    </div>
  </div>;
}

function BackgroundPreview() {
  const [pattern, setPattern] = React.useState<PatternBackgroundVariant>("weave");
  return <div className="launch-background-demo" data-example="pattern-background">
    <PatternBackground variant={pattern} opacity={0.3} spacing={27} />
    <div className="launch-background-caption"><Shape name="clover-soft" /><span>Space to think.</span></div>
    <div className="launch-choices" role="group" aria-label="Try a background">
      {([['weave', 'Weave'], ['pebbles', 'Pebbles'], ['folds', 'Folds']] as const).map(([value, label]) => <Button key={value} size="sm" variant={pattern === value ? "secondary" : "ghost"} aria-pressed={pattern === value} onClick={() => { setPattern(value); recordVariant("pattern-background", value, "preview_background"); }}>{label}</Button>)}
    </div>
  </div>;
}

const featured = [
  { id: "motion-drawer", title: "Motion Drawer", detail: "A little stack with room for your ideas.", tone: "blue", demo: DrawerPreview },
  { id: "semantic-bloom", title: "Semantic Bloom", detail: "A wordmark with a life of its own.", tone: "olive", demo: BloomPreview },
  { id: "animated-icon", title: "Animated Icon", detail: "Small gestures. A little personality.", tone: "pink", demo: IconPreview },
  { id: "dock", title: "Dock", detail: "Your favourite tools, close at hand.", tone: "yellow", demo: DockPreview },
  { id: "agent-state", title: "Agent State", detail: "Give the waiting a little character.", tone: "pink", demo: AgentPreview },
  { id: "pattern-background", title: "Subtle Backgrounds", detail: "A little texture. A different feeling.", tone: "olive", demo: BackgroundPreview },
] as const;

export function FeaturedComponents() {
  return <section className="launch-featured" aria-label="Try a few components" id="featured-components">
    {featured.map(({ id, title, detail, tone, demo: Demo }, index) => <article className="launch-specimen" data-tone={tone} data-featured-component={id} key={id}>
      <header><Meta>0{index + 1} / Play with it</Meta><h2><Link href={`/docs/${id}/`}>{title}</Link></h2><p>{detail}</p></header>
      <AnalyticsPreview componentId={id} placement="landing" className="launch-specimen-demo"><Demo /></AnalyticsPreview>
      <footer>
        <MotionDrawer title={`Add ${title}`} description="Copy the command into your React project. The source becomes yours to edit." variant="floating" triggerLabel={`Get ${title}`} trigger={<Button variant="secondary" size="sm">Get component <AnimatedIcon name="plus" size="sm" /></Button>}>
          <div className="launch-install-details"><InstallCommand command={installCommand(id)} componentId={id} /><p>First time here? <Link href="/getting-started/">Start with the setup guide.</Link></p><Link href={`/docs/${id}/`}>See the example and API →</Link></div>
        </MotionDrawer>
        <Button asChild variant="ghost" size="sm"><Link href={`/docs/${id}/`} aria-label={`View ${title} documentation`}>View docs <AnimatedIcon name="arrow-up-right" size="sm" /></Link></Button>
      </footer>
    </article>)}
  </section>;
}
