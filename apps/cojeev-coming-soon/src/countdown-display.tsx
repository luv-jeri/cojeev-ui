import React, { useEffect, useState } from "react";
import { countdown } from "./countdown.mjs";

const PREVIEW_KEY = "cojeev-preview-clock";
/** With no published launch date the page runs a preview clock: thirty days from the first visit on this browser, ticking every
 * second so the timer reads as a timer. It lives in this browser only and never touches launch.json; once it runs out it starts over. */
function previewStart(): string {
  try {
    const kept = localStorage.getItem(PREVIEW_KEY);
    if (kept && Number.isFinite(Date.parse(kept)) && countdown(kept).state === "counting") return kept;
    const fresh = new Date().toISOString();
    localStorage.setItem(PREVIEW_KEY, fresh);
    return fresh;
  } catch { return new Date().toISOString(); }
}

export function Countdown() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/launch.json", { cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Launch date unavailable"); return response.json(); })
      .then(data => {
        if (data.startedAt !== null && (typeof data.startedAt !== "string" || !Number.isFinite(Date.parse(data.startedAt)))) throw new Error("Invalid launch date");
        setStartedAt(data.startedAt);
        if (data.startedAt === null) setPreview(previewStart());
      }).catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!startedAt && !preview) return;
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [startedAt, preview]);
  const remaining = countdown(startedAt ?? preview, now);
  const caption = failed ? "Coming soon" : remaining.state === "elapsed" ? "Almost here." : null;
  return <div className="countdown-block">
    {caption && <div className="countdown-caption">{caption}</div>}
    {!failed && remaining.state !== "elapsed" && <div className="countdown" role="timer" aria-live="off" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds until launch`}>
      {(["days", "hours", "minutes", "seconds"] as const).map((unit, i) => <React.Fragment key={unit}>
        {i > 0 && <span className="time-separator" aria-hidden="true">:</span>}
        <div className="time-unit"><span className="time-number"><span className="time-roll" key={remaining[unit]}>{String(remaining[unit]).padStart(2, "0")}</span></span><span className="time-label">{unit}</span></div>
      </React.Fragment>)}
    </div>}
  </div>;
}
