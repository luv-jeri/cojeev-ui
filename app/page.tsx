import { catalog } from "@/lib/catalog";
import { LandingPage } from "@/components/landing/landing-page";
import "@/components/landing/landing.css";

export default function Home() {
  return <LandingPage componentCount={catalog().length} />;
}
