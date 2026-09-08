import type { Metadata } from "next";
import { ReportingAdmin } from "@/components/reporting/admin";
import "./admin.css";
export const metadata: Metadata = { title: "Private reports · SahaJiv UI", robots: { index: false, follow: false } };
export default function FeedbackAdminPage() { return <ReportingAdmin />; }
