import React, { useEffect, useState } from "react";
import { countdown } from "./countdown.mjs";
import initialLaunch from "../public/launch.json";

const initialLaunchAt = "launchAt" in initialLaunch && typeof initialLaunch.launchAt === "string" && Number.isFinite(Date.parse(initialLaunch.launchAt)) ? initialLaunch.launchAt : null;

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
  const [launch, setLaunch] = useState<string | { launchAt: string } | null>();
  const [preview, setPreview] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/launch.json", { cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Launch date unavailable"); return response.json(); })
      .then(data => {
        if (data.launchAt !== undefined && data.launchAt !== null) {
          if (typeof data.launchAt !== "string" || !Number.isFinite(Date.parse(data.launchAt))) throw new Error("Invalid launch date");
          setLaunch({ launchAt: data.launchAt });
        } else {
          const startedAt = data.launchAt === null && data.startedAt === undefined ? null : data.startedAt;
          if (startedAt !== null && (typeof startedAt !== "string" || !Number.isFinite(Date.parse(startedAt)))) throw new Error("Invalid launch date");
          setLaunch(startedAt);
          if (startedAt === null) setPreview(previewStart());
        }
      }).catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!launch && !preview) return;
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [launch, preview]);
  const remaining = countdown(launch ?? preview, now);
  // A fixed date stays truthful in prerendered HTML, even long after the build.
  const pendingDate = launch === undefined ? initialLaunchAt : null;
  const caption = failed ? "Coming soon" : remaining.state === "elapsed" ? "Almost here." : null;
  return <div className="countdown-block">
    {caption && <div className="countdown-caption">{caption}</div>}
    {!failed && pendingDate && <time className="countdown-caption" dateTime={pendingDate}>{new Date(pendingDate).toISOString().replace("T", " ").replace(":00.000Z", " UTC")}</time>}
    {!failed && !pendingDate && remaining.state !== "elapsed" && <div className="countdown" role="timer" aria-live="off" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds until launch`}>
      {(["days", "hours", "minutes", "seconds"] as const).map((unit, i) => <React.Fragment key={unit}>
        {i > 0 && <span className="time-separator" aria-hidden="true">:</span>}
        <div className="time-unit"><span className="time-number"><span className="time-roll" key={remaining[unit]}>{String(remaining[unit]).padStart(2, "0")}</span></span><span className="time-label">{unit}</span></div>
      </React.Fragment>)}
    </div>}
  </div>;
}
