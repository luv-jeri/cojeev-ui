import type { Metadata } from "next";
import { CreatorPage } from "@/components/landing/creator-page";
import "@/components/landing/landing.css";

export const metadata: Metadata = { title: "Work with Sanjay · Cojeev UI", description: "Thoughtful products, expressive interfaces and working code. Meet Sanjay Kumar, the creator of Cojeev UI." };
export default function WorkWithMe() { return <CreatorPage />; }
