import type { Metadata } from "next";
import { CreatorPage } from "@/components/landing/creator-page";
import "@/components/landing/landing.css";

export const metadata: Metadata = { title: "Work with Sanjay · SahaJiv UI", description: "Thoughtful products, expressive interfaces and working code. Meet Sanjay Kumar, the creator of SahaJiv UI." };
export default function WorkWithMe() { return <CreatorPage />; }
