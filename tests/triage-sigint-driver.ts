// Test helper: runs one judge call so a test can send it Ctrl-C.
import { judge } from "../scripts/triage/judge";
void judge({ id: "x", kind: "bug", title: "t", description: "d", references: [], attachments: [], topicId: null, createdAt: 1 }, { model: "m", codexBin: process.argv[2], timeoutMs: 60000 });
