import type { Diagnostics, Pin, Receipt, ReportKind } from "./contracts";
import type { FrozenSubmission, ReportFile } from "./client";

export type ReportingDraft = {
  kind: ReportKind; title: string; description: string; email: string; topicId?: string;
  pins: Pin[]; files: ReportFile[]; diagnostics: Diagnostics | null;
  frozen: FrozenSubmission | null; attempted: boolean; receipt: Receipt | null;
};
export function emptyDraft(): ReportingDraft { return { kind: "request", title: "", description: "", email: "", pins: [], files: [], diagnostics: null, frozen: null, attempted: false, receipt: null }; }
const databaseName = "cojeev-reporting-v1";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Local draft storage is unavailable.")); return; }
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local draft storage is unavailable."));
    request.onblocked = () => reject(new Error("Local draft storage is blocked by another tab."));
  });
}
async function operation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", mode);
    const request = action(transaction.objectStore("drafts"));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("Could not save this draft.")); };
  });
}
export async function loadDraft(): Promise<ReportingDraft | null> { return (await operation("readonly", store => store.get("current"))) ?? null; }
export async function saveDraft(draft: ReportingDraft): Promise<void> { await operation("readwrite", store => store.put(draft, "current")); }
export async function deleteDraft(): Promise<void> { await operation("readwrite", store => store.delete("current")); }
