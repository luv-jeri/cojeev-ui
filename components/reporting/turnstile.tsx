"use client";

import { useEffect, useRef, useState } from "react";
type TurnstileAPI = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: TurnstileAPI } }
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error("The verification could not load. Check your connection and retry.")); }; document.head.appendChild(script);
  });
  return scriptPromise;
}
export function Turnstile({ siteKey, onToken, attempt, onError, onExpire }: { siteKey: string; onToken: (token: string) => void; attempt: number; onError?: () => void; onExpire?: () => void }) {
  const container = useRef<HTMLDivElement>(null), callback = useRef(onToken), errors = useRef(onError), expiry = useRef(onExpire);
  useEffect(() => { callback.current = onToken; errors.current = onError; expiry.current = onExpire; }, [onToken, onError, onExpire]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true, id: string | undefined;
    callback.current("");
    loadTurnstile().then(() => {
      if (!active || !container.current) return;
      id = window.turnstile?.render(container.current, { sitekey: siteKey, action: "reporting", theme: "auto", size: "flexible", callback: (token: string) => callback.current(token), "expired-callback": () => { callback.current(""); expiry.current?.(); }, "error-callback": () => { callback.current(""); setError("Verification failed. Use Retry verification below."); errors.current?.(); } });
    }).catch(cause => { if (active) { setError(cause.message); errors.current?.(); } });
    return () => { active = false; if (id) window.turnstile?.remove(id); };
  }, [siteKey, attempt]);
  return <div className="report-verification"><div ref={container} />{error && <p role="alert" className="report-error">{error}</p>}</div>;
}
