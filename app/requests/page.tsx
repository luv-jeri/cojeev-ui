import { pageMetadata } from "@/lib/site-config";
import { RequestBoard } from "@/components/reporting/request-board";
import "./requests.css";
export const metadata = pageMetadata("Request a component", "Suggest a component, join requests, and follow what is being built for 000h by Cojeev.", "/requests/");
export default function RequestsPage() { return <RequestBoard />; }
