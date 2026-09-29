import type { Diagnostics, Receipt, ReportKind } from "./contracts";
import type { FrozenSubmission, ReportFile } from "./client";
import type { DraftPin } from "./pin-label";

export type ReportingDraft = {
  kind: ReportKind; title: string; description: string; email: string; topicId?: string;
  pins: DraftPin[]; files: ReportFile[]; diagnostics: Diagnostics | null;
  frozen: FrozenSubmission | null; attempted: boolean; receipt: Receipt | null;
};
export function emptyDraft(): ReportingDraft { return { kind: "request", title: "", description: "", email: "", pins: [], files: [], diagnostics: null, frozen: null, attempted: false, receipt: null }; }
const databaseName = "cojeev-reporting-v1";
// One warm connection for the page's life: a save that has to open the database first can
// lose the race with a reload that follows a close by a few milliseconds.
let connection: Promise<IDBDatabase> | null = null;
function openDatabase(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Local draft storage is unavailable.")); return; }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = db.onclose = () => { connection = null; db.close(); };
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Local draft storage is unavailable."));
    request.onblocked = () => reject(new Error("Local draft storage is blocked by another tab."));
  }).catch(cause => { connection = null; throw cause; });
  return connection;
}
async function operation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", mode);
    const request = action(transaction.objectStore("drafts"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error("Could not save this draft."));
  });
}
export async function loadDraft(): Promise<ReportingDraft | null> { return (await operation("readonly", store => store.get("current"))) ?? null; }
export async function saveDraft(draft: ReportingDraft): Promise<void> { await operation("readwrite", store => store.put(draft, "current")); }

export type ReportingDraftWorkspace = {
  activeKind: ReportKind;
  drafts: Partial<Record<ReportKind, ReportingDraft>>;
};

export async function loadDraftWorkspace(): Promise<ReportingDraftWorkspace | null> {
  const saved = await operation<ReportingDraftWorkspace | undefined>("readonly", store => store.get("workspace"));
  if (saved) return saved;
  const legacy = await loadDraft();
  return legacy ? { activeKind: legacy.kind, drafts: { [legacy.kind]: legacy } } : null;
}

export async function saveDraftWorkspace(workspace: ReportingDraftWorkspace): Promise<void> {
  // Migrate the old single draft atomically: never lose its files or retry key,
  // and do not leave a second private copy behind after a later clear.
  await operation("readwrite", store => {
    const request = store.put(workspace, "workspace");
    store.delete("current");
    return request;
  });
}

// ---- Reports sent from this browser: the `sent` key of the same store ----
export type SentEntry = { kind: ReportKind; title: string; sentAt: number; receipt: Receipt };
export const SENT_LIMIT = 50;
const sentFinished = (state: string) => state === "uploaded" || state === "ready" || state === "expired";
export const importedTitle = (kind: ReportKind) => (kind === "bug" ? "Imported report" : "Imported request");

/** Merges by receipt id: a known entry keeps its title and date and takes the new receipt. Newest first, capped. */
export function mergeSent(list: SentEntry[], entries: SentEntry[]): SentEntry[] {
  const merged = [...list];
  for (const entry of entries) {
    const at = merged.findIndex(item => item.receipt.id === entry.receipt.id);
    if (at >= 0) merged[at] = { ...merged[at], receipt: entry.receipt };
    else merged.push(entry);
  }
  return merged.sort((a, b) => b.sentAt - a.sentAt).slice(0, SENT_LIMIT);
}

/** Moves a finished receipt out of each tab's draft (today's shape) and gives that tab a fresh form. */
export function pullLegacyReceipts(workspace: ReportingDraftWorkspace, now: number): { workspace: ReportingDraftWorkspace; entries: SentEntry[] } {
  const entries: SentEntry[] = [];
  const drafts = { ...workspace.drafts };
  for (const kind of ["request", "bug"] as const) {
    const draft = drafts[kind];
    if (!draft?.receipt || !draft.receipt.attachments.every(file => sentFinished(file.state))) continue;
    entries.push({ kind: draft.kind, title: draft.frozen?.report.title || draft.title || importedTitle(draft.kind), sentAt: now, receipt: draft.receipt });
    drafts[kind] = { ...emptyDraft(), kind: draft.kind };
  }
  return entries.length ? { workspace: { ...workspace, drafts }, entries } : { workspace, entries };
}

/** One readwrite transaction over `sent` (and, when `also` is given, other keys): nothing is written unless all of it completes. */
async function sentTransaction(change: (list: SentEntry[]) => SentEntry[], also?: (store: IDBObjectStore) => void): Promise<SentEntry[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let next: SentEntry[] = [];
    const transaction = db.transaction("drafts", "readwrite");
    const store = transaction.objectStore("drafts");
    const read = store.get("sent");
    read.onsuccess = () => {
      try {
        next = change(Array.isArray(read.result) ? read.result : []);
        store.put(next, "sent");
        also?.(store);
      } catch (cause) { transaction.abort(); reject(cause); }
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onerror = transaction.onabort = () => reject(transaction.error ?? new Error("Could not save the sent list."));
  });
}
export async function loadSent(): Promise<SentEntry[]> {
  const saved = await operation<SentEntry[] | undefined>("readonly", store => store.get("sent"));
  // Anything beyond the newest 50 (an older build, a hand-edited store) is dropped on the way in.
  return Array.isArray(saved) ? mergeSent([], saved) : [];
}
export function commitSent(entries: SentEntry[], workspace?: ReportingDraftWorkspace): Promise<SentEntry[]> {
  return sentTransaction(list => mergeSent(list, entries), workspace && (store => { store.put(workspace, "workspace"); store.delete("current"); }));
}
export function removeSent(receiptId: string): Promise<SentEntry[]> {
  return sentTransaction(list => list.filter(item => item.receipt.id !== receiptId));
}
export function replaceSentReceipt(receipt: Receipt): Promise<SentEntry[]> {
  return sentTransaction(list => list.map(item => item.receipt.id === receipt.id ? { ...item, receipt } : item));
}
