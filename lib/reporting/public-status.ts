import type { ReportKind } from "./contracts";
export type PublicStage = "received" | "reviewing" | "tracked" | "fixed" | "closed";
export type PublicStatus = { kind: ReportKind; sentAt: number; stage: PublicStage; issueNumber?: number; issueUrl?: string; attachments: number };
