export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export type ShareDeps = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  canShare?: (data: { url: string }) => boolean;
  copy: (text: string) => Promise<boolean>;
};

/** The page address without query or hash, tagged so shared visits are countable. */
export function shareLink(location: { origin: string; pathname: string }): string {
  return `${location.origin}${location.pathname}?utm_medium=share`;
}

async function copyOnly(deps: ShareDeps, url: string): Promise<ShareOutcome> {
  try {
    return (await deps.copy(url)) ? "copied" : "failed";
  } catch {
    return "failed";
  }
}

/** Opens the native share sheet when there is one; otherwise, or if it breaks, copies the link. */
export async function shareOrCopy(deps: ShareDeps, url: string, title: string): Promise<ShareOutcome> {
  if (deps.share) {
    try {
      if (deps.canShare?.({ url }) !== false) {
        await deps.share({ title, url });
        return "shared";
      }
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") return "cancelled";
    }
  }
  return copyOnly(deps, url);
}

/** The fallback stays inside the control's tree, including a modal focus scope. */
function copyWithSelection(code: string, trigger: HTMLButtonElement): boolean {
  const document = trigger.ownerDocument;
  const active = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) =>
        selection.getRangeAt(i).cloneRange(),
      )
    : [];
  const field =
    active?.tagName === "INPUT" || active?.tagName === "TEXTAREA"
      ? (active as HTMLInputElement | HTMLTextAreaElement)
      : null;
  const fieldSelection =
    field && field.selectionStart !== null
      ? ([
          field.selectionStart,
          field.selectionEnd,
          field.selectionDirection ?? undefined,
        ] as const)
      : null;
  const view = document.defaultView;
  const scroll = view ? { x: view.scrollX, y: view.scrollY } : null;
  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("data-copy-fallback", "");
  textarea.style.cssText =
    "position:fixed;inset-block-start:0;inset-inline-start:-9999px;width:1px;height:1px;padding:0;border:0;font-size:16px;opacity:0;";
  (trigger.parentElement ?? document.body).append(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, code.length);
    return (
      typeof document.execCommand === "function" && document.execCommand("copy")
    );
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (active?.isConnected) active.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
    // Document selection restoration can reset a focused input's native range.
    if (field?.isConnected && fieldSelection) {
      field.setSelectionRange(...fieldSelection);
    }
    if (view && scroll) view.scrollTo(scroll.x, scroll.y);
  }
}

export async function copyText(
  code: string,
  trigger: HTMLButtonElement,
): Promise<boolean> {
  try {
    const clipboard = trigger.ownerDocument.defaultView?.navigator.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(code);
      return true;
    }
  } catch {
    // An unavailable or denied Clipboard API can still allow a user-initiated copy.
  }
  return copyWithSelection(code, trigger);
}
