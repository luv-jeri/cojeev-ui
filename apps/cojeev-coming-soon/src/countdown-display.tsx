import React, { useEffect, useState } from "react";
import { countdown } from "./countdown.mjs";

export function Countdown() {
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/launch.json", { cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Launch date unavailable"); return response.json(); })
      .then(data => {
        if (data.startedAt !== null && (typeof data.startedAt !== "string" || !Number.isFinite(Date.parse(data.startedAt)))) throw new Error("Invalid launch date");
        setStartedAt(data.startedAt);
      }).catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!startedAt) return;
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [startedAt]);
  const remaining = countdown(startedAt, now);
  const caption = failed ? "Coming soon" : remaining.state === "elapsed" ? "Almost here." : null;
  return <div className="countdown-block">
    {caption && <div className="countdown-caption">{caption}</div>}
    {!failed && remaining.state !== "elapsed" && <div className="countdown" role="timer" aria-live="off" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds until launch`}>
      {(["days", "hours", "minutes", "seconds"] as const).map((unit, i) => <React.Fragment key={unit}>
        {i > 0 && <span className="time-separator" aria-hidden="true">:</span>}
        <div className="time-unit"><span className="time-number">{String(remaining[unit]).padStart(2, "0")}</span><span className="time-label">{unit}</span></div>
      </React.Fragment>)}
    </div>}
  </div>;
}
