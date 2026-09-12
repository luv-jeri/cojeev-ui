import { pageMetadata, site } from "@/lib/site-config";
import { catalog } from "@/lib/catalog";
import { LandingPage } from "@/components/landing/landing-page";
import "@/components/landing/landing.css";
import "@/components/landing/shape-playground.css";

export const metadata = { ...pageMetadata("Expressive React components", site.description, "/"), title: { absolute: site.title } };

export default function Home() {
  return <LandingPage componentCount={catalog().length} />;
}
