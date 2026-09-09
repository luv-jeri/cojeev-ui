import { catalog } from "@/lib/catalog";
import { LandingPage } from "@/components/landing/landing-page";
import "@/components/landing/landing.css";
import "@/components/landing/shape-playground.css";

export default function Home() {
  return <LandingPage componentCount={catalog().length} />;
}
