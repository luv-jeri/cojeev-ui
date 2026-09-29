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
