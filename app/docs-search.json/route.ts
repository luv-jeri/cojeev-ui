import { createDocsSearch } from "@/lib/docs-search";

export const dynamic = "force-static";
export const GET = createDocsSearch().staticGET;
