# What still needs you at launch

The local work can continue while you are away. These account and real-delivery checks cannot be replaced with passing local tests.

## When you return

1. **Unlock the Mac and make Chrome available.** The September 12 account-browser recheck explicitly reported that the Mac is locked and returned `User unavailable`. Existing sign-ins do not themselves supply the missing deployment credentials.
2. **Complete any security confirmation shown by GitHub or Cloudflare.** The remaining credentials must be narrowly scoped to these repositories and Workers. Do not paste keys into chat. Existing Resend keys are already stored in protected GitHub environments and must not be overwritten or rotated just because their original setup buffers are gone.
3. **Check the chosen inbox.** After the labelled live smoke test, confirm the acknowledgement, reply forwarding and release notification actually arrive at `unread.fyi@gmail.com`. A provider accepting an email is not proof that it reached you.
4. **Approve the recorded production release in GitHub after beta passes.** This is the approval gate you requested; it must not be removed to make deployment easier. Beta and production must use the same source commit and their separately tested artifacts.

## Account work still to finish with the signed-in browser

- Repository-scoped GitHub issue credential; CI Cloudflare deployment credential; isolated beta Turnstile widget and bindings.
- Safe supplemental server secrets alongside the existing protected Resend-only bundles. No private values in source, logs or public build variables.
- Beta custom domains and HTTPS verification after deployment.
- Resend signed delivery webhooks, now authorized by you. Unrelated team events are discarded by provider message ID rather than treated as this library's reports.
- Real beta report/attachment/private-inbox/GitHub/email journey, analytics dashboard checks, recovery exercise, then the labelled production smoke report.
- Enable scheduled monitoring only after both live APIs accept their protected health credentials; the activation variable is intentionally off until then.
- Finish native-browser checks of background-tab suspension and the macOS native-select popup. Automated offscreen and simulated-visibility checks do not replace those checks.

These are remaining gates, not a claim they are configured. See [provisioning status](provisioning-status.md) for resources already created and [operations](OPERATIONS.md) for the technical procedure.

No paid upgrade, shadcn directory submission, namespace registration, marketing email or social comment is authorized by this checklist. Marketing research/drafts are in [the launch guide](../marketing/START-HERE.md); posting requires your final approval of the actual text and destination.
