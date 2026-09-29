/* eslint-disable @next/next/no-img-element -- A static mockup: the thumbnail is an inline data URI, not a network image. */
import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatedIcon, StateChevron, type AnimatedIconProps } from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import { Input } from "@/registry/cojeev/ui/input";
import { Textarea, TextareaScrollArea } from "@/registry/cojeev/ui/textarea";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/cojeev/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/registry/cojeev/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/cojeev/ui/dropdown-menu";
import type { PublicStatus } from "@/lib/reporting/public-status";
import { HostPage } from "./host-page";

type Kind = "request" | "bug";
type Step = "edit" | "review" | "receipt";
type Opts = {
  kind: Kind;
  step?: Step;
  filled?: boolean;
  details?: boolean;
  groups?: boolean;
  deliveryOpen?: boolean;
  popover?: boolean;
  menu?: boolean;
  banner?: boolean;
  sent?: "collapsed" | "expanded" | "detail";
  suggestions?: boolean;
  joining?: boolean;
};

const icon = (name: AnimatedIconProps["name"], size = 18) => (
  <AnimatedIcon name={name} style={{ width: size, height: size }} aria-hidden="true" />
);
const noop = (event: { preventDefault: () => void }) => event.preventDefault();

// A small painted square stands in for the screenshot thumbnail.
const THUMB =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#95BAE8"/><rect x="8" y="10" width="48" height="8" rx="3" fill="#fff"/><rect x="8" y="26" width="30" height="6" rx="3" fill="#fff" opacity=".8"/><rect x="8" y="38" width="40" height="6" rx="3" fill="#fff" opacity=".8"/></svg>',
  );
const REPORT_ID = "3f9c2b1e-7d54-4a86-9b0e-5c1a2d8e4f70";
const PIN_PATH = "main > p:nth-of-type(1)";

/* ---------- the edit form ---------- */

function Tool({ label, word, name, pressed }: { label: string; word: string; name: AnimatedIconProps["name"]; pressed?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="report-tool" aria-label={label} aria-pressed={pressed}>
          {icon(name, 17)}
          <span className="report-tool-label">{word}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function InfoPopover({ kind, open }: { kind: Kind; open?: boolean }) {
  const line = (name: AnimatedIconProps["name"], text: string) => (
    <li>
      {icon(name, 16)}
      <span>{text}</span>
    </li>
  );
  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="report-info" aria-label="How this works">
          {icon("info", 18)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="report-popover" aria-label="How this works" align="end" collisionPadding={12}>
        {kind === "request" && (
          <>
            <p>We aim to build requests within 36 hours, depending on demand and complexity.</p>
            <p>Your title is private until we approve it for the public board. Please keep personal details out of it.</p>
          </>
        )}
        <ul>
          {line("paperclip", "Attach: add images or videos.")}
          {kind === "bug" && (
            <>
              {line("pin", "Pin: point at the part of the page you mean.")}
              {line("crop", "Area: screenshot part of the page.")}
              {line("camera", "Page: screenshot the whole page.")}
              {line("settings", "Details: add browser details.")}
            </>
          )}
        </ul>
        <p>
          PNG, JPEG, WebP, MP4 or WebM. Up to 6 files, 10 MB each, 30 MB total. Screenshots are taken only when you ask,
          and you check each one first.
        </p>
        {kind === "bug" && (
          <div>
            <h3>Browser details</h3>
            <p>
              Adds device info, recent errors, failed routes and clicks. Never form values, cookies or storage. You can
              review and remove each group.
            </p>
          </div>
        )}
        <p>Your draft is saved on this device and stays here when you close this panel.</p>
      </PopoverContent>
    </Popover>
  );
}

function MoreMenu({ open }: { open?: boolean }) {
  return (
    <DropdownMenu open={open} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="report-more" aria-label="More">
          {icon("ellipsis", 18)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>Clear draft</DropdownMenuItem>
        <DropdownMenuItem>Request board</DropdownMenuItem>
        <DropdownMenuItem>Open a saved receipt</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const Chip = ({ children, title, remove }: { children: ReactNode; title?: string; remove: string }) => (
  <li className="report-chip" title={title}>
    <span className="report-chip-text">{children}</span>
    <button type="button" className="report-chip-remove" aria-label={remove}>
      {icon("x", 14)}
    </button>
  </li>
);

function DiagnosticGroups() {
  const groups: [string, string][] = [
    ["Device & page", "4 events"],
    ["Warnings & errors", "2 events"],
    ["Failed requests", "1 events"],
    ["Recent actions", "6 events"],
  ];
  return (
    <div className="report-diagnostic-groups">
      {groups.map(([name, count], index) => (
        <details key={name} open={index === 0}>
          <summary>
            {name}
            <span>{count}</span>
          </summary>
          <ScrollArea variant="plain" className="report-source" viewportProps={{ "aria-label": "Report details", tabIndex: 0 }}>
            <pre>{'{\n  "viewport": "1440 x 1000",\n  "language": "en-GB",\n  "path": "/docs/date-picker"\n}'}</pre>
          </ScrollArea>
          <Button variant="ghost" size="sm">
            Remove this group
          </Button>
        </details>
      ))}
      <Button variant="ghost" size="sm">
        Remove all browser details
      </Button>
    </div>
  );
}

const SENT = [
  { kind: "bug" as const, title: "Menu closes before I can choose", date: "29 Sep", status: "Tracked as #412" },
  { kind: "request" as const, title: "Calendar range", date: "28 Sep", status: "Received" },
  { kind: "bug" as const, title: "Export fails on Safari", date: "25 Sep", status: "Fixed" },
];

function ReceiptDetail({ kind }: { kind: Kind }) {
  return (
    <div className="report-sent-detail">
      <p className="report-receipt-status">
        <span>Status: Tracked as #412</span>
        <span>1 of 1 files uploaded</span>
      </p>
      <Delivery kind={kind} open={false} />
      <p className="report-help">Keep your receipt. It lets you check this report later.</p>
      <div className="report-row">
        <Button variant="outline">Refresh status</Button>
        <Button variant="outline">Download receipt</Button>
        <Button variant="outline" asChild>
          <a href="#track">Track this report</a>
        </Button>
      </div>
      <p className="report-warning">This key is the only way to check this report from here.</p>
      <div className="report-row">
        <Button variant="ghost">Remove from this device</Button>
      </div>
    </div>
  );
}

function SentBlock({ mode }: { mode: "collapsed" | "expanded" | "detail" }) {
  const open = mode !== "collapsed";
  return (
    <div className="report-sent">
      <button type="button" className="report-sent-toggle" aria-expanded={open}>
        <span>Sent from this browser · {SENT.length}</span>
        <StateChevron open={open} />
      </button>
      {open && (
        <ul className="report-sent-list">
          {SENT.map((entry, index) => (
            <li key={entry.title}>
              <button type="button" className="report-sent-row" aria-expanded={mode === "detail" && index === 0}>
                {icon(entry.kind === "bug" ? "bug" : "sparkles", 18)}
                <span className="report-sent-row-title">{entry.title}</span>
                <span className="report-sent-row-meta">
                  {entry.date} · {entry.status}
                </span>
                <StateChevron open={mode === "detail" && index === 0} />
              </button>
              {mode === "detail" && index === 0 && <ReceiptDetail kind={entry.kind} />}
            </li>
          ))}
          <li className="report-sent-note">Only the newest 50 are kept. Download a receipt to keep an older one.</li>
        </ul>
      )}
    </div>
  );
}

function EditForm(o: Opts) {
  const request = o.kind === "request";
  const filled = !!o.filled;
  const joining = !!o.joining;
  const suggest = !!o.suggestions;
  const titleValue = joining ? "Calendar range" : suggest ? "Calendar" : filled ? "The menu closes before I can choose" : "";
  return (
    <form className="report-form" onSubmit={noop}>
      {o.banner && (
        <div className="report-sent-banner" role="status">
          <span>{request ? "Request sent. Check your inbox for a receipt." : "Report sent. Check your inbox for a receipt."}</span>
          <a href="#view">View</a>
        </div>
      )}
      <label className="report-field">
        <span className="report-label-row">{request ? "What component do you want?" : "Short summary"}</span>
        <Input
          name="title"
          value={titleValue}
          readOnly
          disabled={joining}
          placeholder={request ? "e.g. A date range picker" : "e.g. The menu closes before I can choose"}
        />
      </label>
      {joining ? (
        <div className="report-notice">
          <p>Joining this request. Your email counts once.</p>
          <button type="button" className="report-link-button">
            Ask for something else
          </button>
        </div>
      ) : (
        suggest && (
          <>
            <section className="report-suggestions">
              <h3>Already in the library</h3>
              <a href="#calendar">
                <span>Calendar</span>
                {icon("arrow-up-right", 16)}
              </a>
            </section>
            <section className="report-suggestions">
              <h3>Others want this too</h3>
              {[
                ["Calendar range", "12 people"],
                ["Date range picker", "3 people"],
              ].map(([title, people]) => (
                <button type="button" key={title}>
                  <span>{title}</span>
                  <span>
                    {people} · <span className="report-join-label">Join</span>
                  </span>
                </button>
              ))}
            </section>
          </>
        )
      )}
      <label className="report-field">
        <span className="report-label-row">
          <span>{request ? "How would you use it?" : "What happened?"}</span>
          {joining && <span className="report-optional">Optional</span>}
        </span>
        <TextareaScrollArea>
          <Textarea
            name="description"
            readOnly
            value={
              filled
                ? "I open the actions menu and click an item. The menu closes first, so nothing happens."
                : ""
            }
            placeholder={request ? "Who needs it and why. Links welcome." : "What you did, what you expected, what you saw."}
          />
        </TextareaScrollArea>
      </label>
      <TooltipProvider>
        <div className="report-toolbar">
          <Tool label="Attach files" word="Attach" name="paperclip" />
          {!request && (
            <>
              <Tool label="Pin elements" word="Pin" name="pin" />
              <Tool label="Select area" word="Area" name="crop" />
              <Tool label="Full page" word="Page" name="camera" />
              <Tool label="Include browser details" word="Details" name="settings" pressed={!!o.details} />
            </>
          )}
          <InfoPopover kind={o.kind} open={o.popover} />
        </div>
      </TooltipProvider>
      {filled && !request && (
        <div className="report-chips">
          <div className="report-attachments">
            <figure className="report-chip">
              <img className="report-media" src={THUMB} alt="Attachment preview: screenshot.png" />
              <figcaption>
                <span className="report-chip-text">screenshot.png</span>
                <button type="button" className="report-chip-remove" aria-label="Remove screenshot.png">
                  {icon("x", 14)}
                </button>
              </figcaption>
            </figure>
          </div>
          <ol className="report-pins">
            <Chip title={PIN_PATH} remove="Remove pin 1">
              1 · Paragraph “The example preserves mounted fields…”
            </Chip>
            <Chip title="main > div > button" remove="Remove pin 2">
              2 · Button “Copy code”
            </Chip>
          </ol>
          {o.details && (
            <div className="report-diagnostics-chip report-chip">
              <span className="report-chip-text">Browser details included</span>
              <button type="button" className="report-chip-action" aria-expanded={!!o.groups}>
                Review
              </button>
              <button type="button" className="report-chip-remove" aria-label="Remove browser details">
                {icon("x", 14)}
              </button>
            </div>
          )}
          {o.groups && <DiagnosticGroups />}
        </div>
      )}
      <label className="report-field">
        <span className="report-label-row">Your email</span>
        <Input name="email" type="email" value={filled ? "sam@example.com" : ""} readOnly placeholder="you@example.com" aria-describedby="email-help" />
      </label>
      <p id="email-help" className="report-help">
        Private. Used only for updates.
      </p>
      <div className="report-form-footer">
        <Button type="submit" fullWidth>
          Review {request ? "request" : "report"}
          {icon("arrow-up-right", 17)}
        </Button>
        <div className="report-footer-row">
          <p className="report-help" role="status">
            Draft saved
          </p>
          <MoreMenu open={o.menu} />
        </div>
        {o.sent && <SentBlock mode={o.sent} />}
      </div>
    </form>
  );
}

/* ---------- review and receipt ---------- */

function Review({ kind }: { kind: Kind }) {
  const request = kind === "request";
  return (
    <div className="report-review">
      <h2>Ready to send?</h2>
      <p className="report-privacy-line">
        {request ? "Private until we approve your title." : "Private. The public issue shows only a reference."}
      </p>
      <div className="report-review-summary">
        <strong>{request ? "Calendar range" : "The menu closes before I can choose"}</strong>
        <p>
          {request
            ? "Our team plans trips across two months and needs to pick a start and end date in one control."
            : "I open the actions menu on the docs page and click a menu item. On a slow connection the menu closes first."}
        </p>
        <small>Reply to sam@example.com</small>
        <div className="report-attachments">
          <figure>
            <img className="report-media" src={THUMB} alt="Attachment preview: screenshot.png" />
            <figcaption>
              <span>
                screenshot.png
                <small>image/png · 84 KB</small>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
      <details className="report-json">
        <summary>See exactly what will be sent</summary>
      </details>
      <p className="report-help">
        By sending you approve everything shown, including anything visible in your files. Files and technical details are
        deleted after 30 days; your email and report after 180.
      </p>
      <div className="report-row">
        <Button>{request ? "Send request" : "Send report"}</Button>
        <Button variant="ghost">Back to edit</Button>
      </div>
    </div>
  );
}

function Delivery({ kind, open }: { kind: Kind; open: boolean }) {
  return (
    <details className="report-delivery" open={open}>
      <summary>Delivery details</summary>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>Received</dd>
        </div>
        <div>
          <dt>Email receipt</dt>
          <dd>Accepted by the email provider, delivery not confirmed yet</dd>
        </div>
        <div>
          <dt>Issue</dt>
          <dd>{kind === "bug" ? "Being reviewed" : "Waiting to be created"}</dd>
        </div>
        <div>
          <dt>Attachments</dt>
          <dd>1 uploaded</dd>
        </div>
        <div>
          <dt>Report ID</dt>
          <dd>{REPORT_ID}</dd>
        </div>
      </dl>
    </details>
  );
}

function Receipt({ kind, deliveryOpen }: { kind: Kind; deliveryOpen?: boolean }) {
  const request = kind === "request";
  return (
    <div className="report-receipt">
      <div className="report-receipt-seal">{icon("check", 30)}</div>
      <h2>{request ? "Your request is received." : "Your report is received."}</h2>
      <p>
        {request
          ? "We’ll email you when we’ve looked at it, and again when it’s live."
          : "We’re looking into it. We’ll email you when it’s tracked, and again when it’s fixed."}
      </p>
      <p className="report-receipt-status">
        <span>Status: Received</span>
        <span>1 of 1 files uploaded</span>
      </p>
      <Delivery kind={kind} open={!!deliveryOpen} />
      <p className="report-help">Keep your receipt. It lets you check this report later.</p>
      <div className="report-row">
        <Button variant="outline">Refresh status</Button>
        <Button variant="outline">Download receipt</Button>
      </div>
      <div className="report-row">
        <Button variant="ghost">Start another</Button>
        <Button variant="ghost">Request board</Button>
      </div>
    </div>
  );
}

/* ---------- the drawer ---------- */

function Drawer({ o }: { o: Opts }) {
  const step = o.step ?? "edit";
  const content =
    step === "edit" ? <EditForm {...o} /> : step === "review" ? <Review kind={o.kind} /> : <Receipt kind={o.kind} deliveryOpen={o.deliveryOpen} />;
  return (
    <div className="report-sheet">{content}</div>
  );
}

function ReportDrawer({ o }: { o: Opts }) {
  return (
    <MotionDrawer
      open
      variant="stack"
      side="end"
      width={580}
      enableDrag={false}
      title="Request a feature or report a bug"
      description="Tell us what’s missing or what got in your way."
      closeLabel="Close reporting panel"
      trigger={<button type="button" className="report-launcher" data-hidden="" />}
      value={o.kind}
      onValueChange={() => {}}
      panels={[
        {
          value: "request",
          label: "Request a feature",
          icon: icon("sparkles", 17),
          children: o.kind === "request" ? <Drawer o={o} /> : null,
        },
        {
          value: "bug",
          label: "Report a bug",
          icon: icon("bug", 17),
          children: o.kind === "bug" ? <Drawer o={o} /> : null,
        },
      ]}
    />
  );
}

/* ---------- pin mode and capture ---------- */

type Box = { left: number; top: number; width: number; height: number };
const measure = (id: string): Box | null => {
  const r = document.getElementById(id)?.getBoundingClientRect();
  return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
};
const boxStyle = (b: Box): CSSProperties => ({ left: b.left - 2, top: b.top - 2, width: b.width + 4, height: b.height + 4 });

const PINS = [
  { n: 1, id: "host-heading", kind: "Heading" },
  { n: 2, id: "host-copy", kind: "Button" },
  { n: 3, id: "host-paragraph", kind: "Paragraph" },
];

function PinMode() {
  const [boxes, setBoxes] = useState<Record<string, Box | null>>({});
  useLayoutEffect(() => {
    const run = () =>
      setBoxes(Object.fromEntries([...PINS.map((p) => p.id), "host-item"].map((id) => [id, measure(id)])));
    run();
    void document.fonts.ready.then(run);
    addEventListener("resize", run);
    return () => removeEventListener("resize", run);
  }, []);
  const hover = boxes["host-item"];
  return (
    <>
      <HostPage />
      <div data-reporting-chrome="" className="report-picker">
        {PINS.map((pin) => {
          const box = boxes[pin.id];
          if (!box) return null;
          const newest = pin.n === PINS.length;
          return (
            <div
              key={pin.id}
              className="report-pin-marker"
              style={{ ...boxStyle(box), ...(newest ? { animationPlayState: "paused", animationDelay: "-0.35s" } : {}) }}
              data-pulse={newest ? "true" : undefined}
            >
              <span>{pin.n}</span>
            </div>
          );
        })}
        {hover && (
          <div className="report-pin-outline" style={boxStyle(hover)}>
            <span className="report-pin-tag">List item “Attachments keep their order”</span>
          </div>
        )}
        <div className="report-picker-toolbar" role="dialog" aria-label="Pin elements">
          <strong>Pin the elements involved · 3/8</strong>
          <p aria-live="polite">Pinned 3 · Paragraph “The example preserves mounted…”</p>
          <ol className="report-pin-mini">
            {PINS.map((pin) => (
              <li key={pin.n}>
                <button type="button" aria-label={`Remove pin ${pin.n}`}>
                  {pin.n} · {pin.kind}
                </button>
              </li>
            ))}
          </ol>
          <div className="report-row">
            <Button variant="outline">Undo pin</Button>
            <Button>Done</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function CaptureProgress({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Reading the page", "Drawing the screenshot", "Ready to check"];
  return (
    <>
      <HostPage />
      <div data-reporting-chrome="" className="report-capture-scrim">
        <div className="report-capture-card" role="dialog" aria-label="Capturing a screenshot">
          <h2>Capturing a screenshot</h2>
          <div className="report-progress-bar" aria-hidden="true">
            <span style={{ animationPlayState: "paused", animationDelay: "-0.5s" }} />
          </div>
          <ol className="report-capture-steps">
            {steps.map((label, index) => (
              <li
                key={label}
                data-state={index + 1 < step ? "done" : index + 1 === step ? "current" : "todo"}
                aria-current={index + 1 === step ? "step" : undefined}
              >
                {label}
              </li>
            ))}
          </ol>
          {step === 2 && <p className="report-help">Still working · 5s</p>}
          <p className="report-help">Nothing is attached until you check the screenshot.</p>
          <div className="report-row">
            <Button variant="outline">Cancel screenshot</Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- the tracking page ---------- */

const STAGES = ["received", "reviewing", "tracked", "fixed"] as const;
function TrackPage({ status }: { status: PublicStatus | null }) {
  if (!status)
    return (
      <main className="track-page">
        <h1>Report not found</h1>
        <p>Check the link in your email, or open your report from the browser you sent it from.</p>
      </main>
    );
  const request = status.kind === "request";
  const closed = status.stage === "closed";
  const current = STAGES.indexOf(status.stage as (typeof STAGES)[number]);
  const names = [
    "Received",
    "Being reviewed",
    status.issueNumber ? (
      <a key="issue" href={status.issueUrl} rel="noopener noreferrer">
        Tracked as #{status.issueNumber}
      </a>
    ) : (
      "Tracked"
    ),
    request ? "Live" : "Fixed",
  ];
  return (
    <main className="track-page">
      <h1>{request ? "Your request" : "Your report"}</h1>
      <div className="track-fact">
        <span>Sent</span>
        <span>29 September 2026</span>
      </div>
      {closed ? (
        <div className="track-closed">
          <strong>Closed</strong>
          <p>We checked your report, but it isn’t something we can act on, so we’ve closed it.</p>
        </div>
      ) : (
        <ol className="track-stepper">
          {names.map((name, index) => (
            <li key={index} data-state={index < current ? "done" : index === current ? "current" : "todo"} aria-current={index === current ? "step" : undefined}>
              {name}
            </li>
          ))}
        </ol>
      )}
      {status.attachments > 0 && (
        <div className="track-fact">
          <span>{status.attachments === 1 ? "1 file attached" : `${status.attachments} files attached`}</span>
        </div>
      )}
    </main>
  );
}

/* ---------- the state table ---------- */

const ISSUE = { issueNumber: 412, issueUrl: "https://github.com/cojeev/cojeev-ui/issues/412" };
const SENT_AT = Date.UTC(2026, 8, 29);

export function Mockup({ state }: { state: string }) {
  const bug = (o: Omit<Opts, "kind"> = {}): Opts => ({ kind: "bug", ...o });
  const req = (o: Omit<Opts, "kind"> = {}): Opts => ({ kind: "request", ...o });
  const drawers: Record<string, Opts> = {
    "request-edit": req(),
    "bug-edit": bug({ filled: true, details: true }),
    "request-review": req({ step: "review" }),
    "bug-review": bug({ step: "review" }),
    "request-receipt": req({ step: "receipt" }),
    "bug-receipt": bug({ step: "receipt" }),
    "request-suggestions": req({ suggestions: true }),
    "request-joining": req({ joining: true }),
    "bug-details-review": bug({ filled: true, details: true, groups: true }),
    "bug-receipt-delivery": bug({ step: "receipt", deliveryOpen: true }),
    "bug-info-popover": bug({ popover: true }),
    "request-more-menu": req({ menu: true }),
    "bug-sent-banner": bug({ banner: true, sent: "collapsed" }),
    "request-sent-banner": req({ banner: true, sent: "collapsed" }),
    "sent-list-collapsed": bug({ sent: "collapsed" }),
    "sent-list-expanded": bug({ sent: "expanded" }),
    "sent-detail": bug({ sent: "detail" }),
  };
  if (drawers[state]) return <ReportDrawer o={drawers[state]} />;
  if (state === "pin-mode") return <PinMode />;
  if (state.startsWith("capture-progress-")) return <CaptureProgress step={Number(state.slice(-1)) as 1 | 2 | 3} />;
  const track: Record<string, PublicStatus | null> = {
    "track-received": { kind: "request", sentAt: SENT_AT, stage: "received", attachments: 1 },
    "track-tracked": { kind: "bug", sentAt: SENT_AT, stage: "tracked", attachments: 0, ...ISSUE },
    "track-closed": { kind: "bug", sentAt: SENT_AT, stage: "closed", attachments: 0 },
    "track-not-found": null,
  };
  if (state in track) return <TrackPage status={track[state]} />;
  return <p style={{ padding: 24 }}>Unknown state: {state}</p>;
}
