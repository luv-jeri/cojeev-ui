import { pageMetadata } from "@/lib/site-config";
import { CreatorPage } from "@/components/landing/creator-page";
import "@/components/landing/landing.css";

export const metadata = pageMetadata("Meet the maker", "Meet Sanjay Kumar, the designer and developer building 000h by Cojeev.", "/about/");
export default function WorkWithMe() { return <CreatorPage />; }
