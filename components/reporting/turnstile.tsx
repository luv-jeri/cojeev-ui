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
export function Turnstile({ siteKey, onToken, attempt }: { siteKey: string; onToken: (token: string) => void; attempt: number }) {
  const container = useRef<HTMLDivElement>(null), callback = useRef(onToken);
  useEffect(() => { callback.current = onToken; }, [onToken]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true, id: string | undefined;
    callback.current("");
    loadTurnstile().then(() => {
      if (!active || !container.current) return;
      id = window.turnstile?.render(container.current, { sitekey: siteKey, action: "reporting", theme: "auto", size: "flexible", callback: (token: string) => callback.current(token), "expired-callback": () => callback.current(""), "error-callback": () => { callback.current(""); setError("Verification failed. Use Retry verification below."); } });
    }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; if (id) window.turnstile?.remove(id); };
  }, [siteKey, attempt]);
  return <div className="report-verification"><div ref={container} />{error && <p role="alert" className="report-error">{error}</p>}</div>;
}
