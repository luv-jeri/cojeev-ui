import Link from "next/link";
import { ExploreCojeevLink } from "@/components/explore-cojeev-link";

export default function NotFound() {
  return <main>
    <h1>Page not found</h1>
    <p><Link href="/">Return home</Link></p>
    <ExploreCojeevLink />
  </main>;
}
