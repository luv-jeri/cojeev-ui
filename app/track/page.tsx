import { pageMetadata } from "@/lib/site-config";
import { TrackPage } from "@/components/reporting/track-page";
import "../styles/track.css";
// Reached only from a private link: keep it out of search, and never send the address (with its fragment) onward.
export const metadata = { ...pageMetadata("Your report", "Follow the status of a report you sent to 000h by Cojeev.", "/track/"), robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function Page() { return <TrackPage />; }
