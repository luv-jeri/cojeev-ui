import type { Metadata } from "next";
import { RequestBoard } from "@/components/reporting/request-board";
import "./requests.css";
export const metadata: Metadata = { title: "Request a component · SahaJiv UI", description: "Suggest a component, join requests and follow what is being built for SahaJiv UI." };
export default function RequestsPage() { return <RequestBoard />; }
