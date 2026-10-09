# Contact form on the maker pages (2026-10-09)

Owner request, 2026-10-09: "can we open the email app ? when click on email button ? also cant we also have a simppe form to send us the mail dieclty fromt he apge itself please lie cntact me"

## Goal

A visitor on `/work-with-me` or `/about` (both render `CreatorPage` in `components/landing/creator-page.tsx`) can send Sanjay a message from the page itself. They don't need a mail app, and they don't need to copy an address. Sanjay gets it as an email he can reply to directly.

## Success criteria

1. With the contact flag on (`siteFlags.contactEnabled`), the page shows a form with Name, Email and Message fields, the Turnstile check, and a **Send message** button. With the flag off, there is no form.
2. A valid submission emails `CONTACT_NOTIFICATION_EMAIL` from `EMAIL_FROM` (hello@cojeev.com), with `reply_to` set to the visitor's address. Subject: `000h contact from <name>`. Plain-text body containing name, email, message and page path. HTML, if any, is escaped with the existing `escapeHTML`.
3. The visitor sees "Thanks, <name>. Your message is on its way. I'll reply to <email>." The success text goes in a `role=status` region. Errors (rate limit, security check, network) appear inline, and the draft is kept.
4. Abuse controls match the existing report endpoint: exact Origin allow-list, Turnstile verify (same widget and `action: "reporting"`), the per-IP 10-per-10-minutes limit, and a bounded body (8 KB). Also a hidden honeypot field (`company`): if it's filled, reply 200 and send nothing. The idempotency id is a client-generated UUID, so a double submit sends once.
5. Messages are stored in D1 (new migration `0005_contact.sql`, table `contact_messages`: id, created_at, name, email, message, page, delivery_status, provider_id). If Resend fails, the message is kept and not lost. The existing scheduled `cleanup` deletes rows older than 90 days.
6. Email counts against the existing daily and monthly email limits, the same way report emails do. Read how `email_attempts` is used in `src/resend.ts` / `src/delivery.ts` and follow it. Nothing is logged with names, addresses or message text.
7. The **Email me** button stays as the secondary action (mailto plus copy address). The form becomes the main way to make contact.

## Shape

- Worker: `POST /v1/contact` in `workers/reporting/src/index.ts`. Put the logic in a new `workers/reporting/src/contact.ts`. Reuse `assertBrowserOrigin`, `readJSON`, `checkAbuse`, `HttpError`, `escapeHTML`, the email-limit helpers and the Resend sender. If `sendResend` is too tied to the outbox `Delivery` type, add a small sibling function in `resend.ts`; don't fork the HTTP call. New var `CONTACT_NOTIFICATION_EMAIL` in `wrangler.jsonc` (production `hellosanjaygautam@gmail.com`, matching `contactEmail` in `lib/site-config.ts`). Set it in every wrangler config the release script reads. If it's unset, the endpoint returns 503 "Contact is not configured."
- Validation: name 1–100 chars, trimmed. Email must be a basic `x@y.z` with no spaces or newlines, max 254. Message 10–4000 chars. Reject CR/LF in name and email (header injection).
- Client: `components/landing/contact-form.tsx`, a client component. Use the library's own field and button components (look at what the reporting widget uses, `components/reporting/reporting-widget.tsx`, and reuse `components/reporting/turnstile.tsx` and the reporting base URL and config fetch in `lib/reporting/client.ts`). Styles go in `components/landing/landing.css`, using the page's existing tokens (`--v-*`, `--s-*`, `--r-*`). Readable in light and dark. Every input has a visible label. It must fit at 360px.
- Placement: a "Send me a message" block in the `creator-practice` section, replacing the second `EmailMe` row's role as the main action. Keep `EmailMe` next to it as the secondary choice.

## Tests (smallest set that proves it)

- `workers/reporting/test/integration.test.mjs`, following its existing harness:
  - Happy path: stores the message and sends one Resend call with the right to, from and reply_to.
  - Honeypot: no send.
  - Bad origin: 403.
  - Invalid email or newline in name: 400.
  - Duplicate id: sends once.
  - Rate limit: 429.
  - Email limit reached: stored, not sent.
- A test in `tests/launch-environment.test.ts` (or a new small test) that the form renders only when the contact flag is on.
- Run: `npm run reporting:test`, `npm run typecheck` (after `npx next typegen` if needed), `npm run lint`, the touched `tests/*.test.ts` files, `node scripts/build-route-styles.mjs --check` (rebuild if needed), `npm run reporting:check`.

## Out of scope

No deploy, push, PR or secret change; the coordinator does those after review. Don't touch the report flow's behaviour. Don't add npm dependencies.
