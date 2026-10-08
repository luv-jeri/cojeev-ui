"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { Field, FieldControl, FieldLabel } from "@/registry/cojeev/ui/field";
import { Input } from "@/registry/cojeev/ui/input";
import { Textarea } from "@/registry/cojeev/ui/textarea";
import { Turnstile } from "@/components/reporting/turnstile";
import { REPORTING_API, REPORTING_SITE_KEY, ReportingError, reportingFetch, type ReportingConfig } from "@/lib/reporting/client";

type Draft = { name: string; email: string; message: string; company: string };
type Submission = Draft & { id: string; page: string };
export function ContactForm() {
  const heading = React.useId();
  const [draft, setDraft] = React.useState<Draft>({ name: "", email: "", message: "", company: "" });
  const [config, setConfig] = React.useState<ReportingConfig | null>(null), [configError, setConfigError] = React.useState("");
  const [error, setError] = React.useState(""), [success, setSuccess] = React.useState("");
  const [busy, setBusy] = React.useState(false), [locked, setLocked] = React.useState(false);
  const [token, setToken] = React.useState(""), [attempt, setAttempt] = React.useState(0), [configAttempt, setConfigAttempt] = React.useState(0);
  const [verificationFailed, setVerificationFailed] = React.useState(false);
  const submission = React.useRef<Submission | null>(null), sending = React.useRef(false);
  React.useEffect(() => {
    if (!REPORTING_API) return;
    const abort = new AbortController();
    reportingFetch<ReportingConfig>("/v1/config", { signal: abort.signal }).then(value => {
      if (!abort.signal.aborted) { setConfig(value); setConfigError(""); }
    }).catch(() => {
      if (!abort.signal.aborted) setConfigError("Contact could not connect. Your draft is still here. Retry the connection.");
    });
    return () => abort.abort();
  }, [configAttempt]);
  function change(key: keyof Draft, value: string) { setDraft(current => ({ ...current, [key]: value })); }
  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (!draft.name.trim() || /[\r\n]/.test(draft.name) || /\s/.test(draft.email) || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(draft.email) || draft.message.trim().length < 10) {
      setError("Enter your name, a valid email and a message of at least 10 characters."); return;
    }
    if (!config || (!config.local && !token)) { setError("Complete the security check and try again."); return; }
    const previouslyAttempted = !!submission.current;
    const frozen = submission.current ?? { ...draft, name: draft.name.trim(), message: draft.message.trim(), id: crypto.randomUUID(), page: window.location.pathname };
    submission.current = frozen; sending.current = true; setBusy(true); setLocked(true); setError("");
    try {
      const result = await reportingFetch<{ ok: boolean; queued?: boolean }>("/v1/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...frozen, turnstileToken: token }) });
      setSuccess(result.queued ? `Thanks, ${frozen.name}. Your message is saved, but email is slow right now. It will keep trying for the next day. If it's urgent, use Email me below.` : `Thanks, ${frozen.name}. Your message is on its way. I'll reply to ${frozen.email}.`);
    } catch (cause) {
      if (!previouslyAttempted && cause instanceof ReportingError && cause.status >= 400 && cause.status < 500 && ![408, 409].includes(cause.status)) {
        submission.current = null; setLocked(false);
      }
      setError(cause instanceof ReportingError && cause.status ? cause.message : "The connection was interrupted. Your draft is still here. Retry sends the same message.");
      setVerificationFailed(cause instanceof ReportingError && cause.status === 403 && /security check/i.test(cause.message));
      setToken(""); setAttempt(current => current + 1);
    } finally { sending.current = false; setBusy(false); }
  }
  const siteKey = REPORTING_SITE_KEY || config?.turnstileSiteKey;
  return <section id="contact" className="contact-block" aria-labelledby={heading}>
    <h3 id={heading}>Send me a message</h3>
    <p className={`contact-status${success ? "" : " sr-only"}`} role="status">{success}</p>
    {!success && <form className="contact-form" onSubmit={send}>
      <Field><FieldLabel>Name</FieldLabel><FieldControl><Input name="name" autoComplete="name" required maxLength={100} value={draft.name} readOnly={locked} onChange={event => change("name", event.target.value)} /></FieldControl></Field>
      <Field><FieldLabel>Email</FieldLabel><FieldControl><Input name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} readOnly={locked} onChange={event => change("email", event.target.value)} /></FieldControl></Field>
      <Field><FieldLabel>Message</FieldLabel><FieldControl><Textarea name="message" required minLength={10} maxLength={4000} rows={6} value={draft.message} readOnly={locked} onChange={event => change("message", event.target.value)} /></FieldControl></Field>
      <div className="contact-honeypot" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" value={draft.company} onChange={event => change("company", event.target.value)} /></label></div>
      {!REPORTING_API && <p>Contact is not connected yet. You can use Email me below.</p>}
      {configError && <div><p role="alert">{configError}</p><Button type="button" variant="outline" size="sm" onClick={() => setConfigAttempt(current => current + 1)}>Retry connection</Button></div>}
      {config && !config.emailEnabled && <p>Email is temporarily unavailable. You can use Email me below.</p>}
      {config && !config.local && (siteKey ? <div className="contact-verification"><Turnstile key={attempt} siteKey={siteKey} onToken={value => { setToken(value); if (value) setVerificationFailed(false); }} onError={() => setVerificationFailed(true)} onExpire={() => setVerificationFailed(true)} attempt={attempt} />{verificationFailed && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setVerificationFailed(false); setToken(""); setAttempt(current => current + 1); }}>Retry verification</Button>}</div> : <p role="alert">The security check is unavailable. You can use Email me below.</p>)}
      {error && <p role="alert">{error}</p>}
      {locked && <p>Your draft is kept as sent. Retry checks the same message so it cannot send twice.</p>}
      <Button type="submit" loading={busy} disabled={busy || !config?.emailEnabled || (!config.local && !token)}>Send message</Button>
    </form>}
  </section>;
}
