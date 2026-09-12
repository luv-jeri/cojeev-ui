import { CreatorPage } from "@/components/landing/creator-page";
import { pageMetadata } from "@/lib/site-config";
import "@/components/landing/landing.css";

export const metadata = pageMetadata("Meet the maker", "Meet Sanjay Kumar, the designer and developer building 000h by Cojeev: expressive components with a human touch.", "/about/");
export default function AboutPage() { return <CreatorPage />; }
