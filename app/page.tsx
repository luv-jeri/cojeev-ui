import Link from "next/link";
import { catalog } from "@/lib/catalog";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card, CardTitle, CardDescription } from "@/registry/sahajiv/ui/card";
import {
  SidebarMenuButton,
  SidebarMenuLabel,
} from "@/registry/sahajiv/ui/sidebar";
import { ShapeScene } from "@/registry/sahajiv/ui/shape-scene";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { Icon } from "@/registry/sahajiv/ui/icon";
import {
  Typography,
  Hero,
  Lead,
  SectionTitle,
  BodySecondary,
  Meta,
} from "@/registry/sahajiv/ui/typography";
export default function Home() {
  const entries = catalog();
  return (
    <main className="home-page">
      <header className="home-nav">
        <Link href="/" className="home-brand">
          <Shape name="star-4" style={{ width: 28, height: 28 }} />
          SahaJiv UI
        </Link>
        <Link href="/docs/button">
          Explore components <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <section className="home-hero">
        <Typography>
          <Badge variant="pink">
            {entries.length} components · one considered system
          </Badge>
          <Hero
            style={{ whiteSpace: "normal", fontSize: "clamp(48px,8vw,104px)" }}
          >
            Room for the
            <br />
            things that matter.
          </Hero>
          <Lead>
            A set of everyday React parts, made to work together. Thoughtful
            surfaces, expressive controls and motion that follows your lead.
          </Lead>
          <div className="home-actions">
            <SidebarMenuButton asChild>
              <Link href="/docs/button">
                <Icon name="arrow-right" />
                <SidebarMenuLabel>Explore the components</SidebarMenuLabel>
              </Link>
            </SidebarMenuButton>
            <Meta>Copy the code. Make it yours.</Meta>
          </div>
        </Typography>
        <div className="home-sculpture">
          <ShapeScene aria-label="Four familiar SahaJiv shapes, brought into three dimensions" />
          <Meta>Familiar shapes. A new dimension.</Meta>
        </div>
      </section>
      <section className="home-components">
        <SectionTitle>Start with a useful part</SectionTitle>
        <BodySecondary>
          Each entry includes configurable live examples,
          install instructions, and its TypeScript API.
        </BodySecondary>
        <div className="home-grid">
          {[
            {
              id: "button",
              title: "Make something happen",
              body: "Buttons and the details of a good interaction.",
              variant: "pink",
            },
            {
              id: "data-table",
              title: "Find the useful details",
              body: "Filter, sort and paginate your own data.",
              variant: "olive",
            },
            {
              id: "questionnaire",
              title: "A thoughtful first step",
              body: "Questions, choices and visible progress.",
              variant: "yellow",
            },
            {
              id: "dialog",
              title: "Make room for focus",
              body: "Accessible layers for the task at hand.",
              variant: "blue",
            },
          ].map((item) => (
            <Link key={item.id} href={`/docs/${item.id}`}>
              <Card
                variant={item.variant as "pink" | "olive" | "yellow" | "blue"}
                lift
              >
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
                <Icon name="arrow-ur" />
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section className="home-components">
        <SectionTitle>Room for a little expression</SectionTitle>
        <BodySecondary>Backgrounds, tactile shapes and small effects that share the same colors, curves and sense of rhythm.</BodySecondary>
        <div className="home-grid">
          {[{id:"ambient-background",title:"A quieter backdrop",body:"Animated color and familiar silhouettes.",variant:"cream"},{id:"shape-scene",title:"Give your shapes depth",body:"Real 3D with a considered static fallback.",variant:"pink"},{id:"text-reveal",title:"Let a thought arrive",body:"A short, natural entrance for your words.",variant:"blue"},{id:"marquee",title:"Keep a good rhythm",body:"A moving track with room to pause.",variant:"olive"}].map(item=><Link key={item.id} href={`/docs/${item.id}/`}><Card variant={item.variant as "cream"|"pink"|"blue"|"olive"}><CardTitle>{item.title}</CardTitle><CardDescription>{item.body}</CardDescription><Icon name="arrow-ur" /></Card></Link>)}
        </div>
      </section>
      <footer className="home-footer">
        <Meta>SahaJiv UI · React components and a shadcn registry</Meta>
        <Meta>
          MIT licensed · Made to be made your own.
        </Meta>
      </footer>
    </main>
  );
}
