import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readSiteFlags } from "../lib/site-config";
import { robotsFile, robotsRules } from "../app/robots";
import { emailReceiptLabel, issueReceiptLabel } from "../lib/reporting/receipt-labels";
import { releaseIdentifier } from "../lib/reporting/diagnostics";
import { CreatorPage } from "../components/landing/creator-page";

const SHA = "a4a04600000000000000000000000000000000ab";

test("deployment flags accept only the two known environments and a real commit hash", () => {
  assert.deepEqual(readSiteFlags({ NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "beta", NEXT_PUBLIC_RELEASE_SHA: SHA, NEXT_PUBLIC_CONTACT_ENABLED: "true" }), {
    environment: "beta",
    releaseSha: SHA,
    contactEnabled: true,
  });
  assert.deepEqual(readSiteFlags({}), { environment: null, releaseSha: null, contactEnabled: false });
  assert.equal(readSiteFlags({ NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "staging" }).environment, null);
  assert.equal(readSiteFlags({ NEXT_PUBLIC_RELEASE_SHA: SHA.toUpperCase() }).releaseSha, null, "only lowercase hex is a release identifier");
  assert.equal(readSiteFlags({ NEXT_PUBLIC_RELEASE_SHA: `${SHA}extra` }).releaseSha, null);
});

test("the contact address is published only on an explicit true", () => {
  for (const value of [undefined, "", "false", "TRUE", "1", "yes"]) {
    assert.equal(readSiteFlags({ NEXT_PUBLIC_CONTACT_ENABLED: value }).contactEnabled, false, `"${value}" must not publish a contact address`);
  }
  assert.equal(readSiteFlags({ NEXT_PUBLIC_CONTACT_ENABLED: "true" }).contactEnabled, true);
});

test("a beta origin is closed to crawlers while every other build stays open", () => {
  assert.deepEqual(robotsRules("beta"), { userAgent: "*", disallow: "/" });
  assert.deepEqual(robotsRules("production"), { userAgent: "*", allow: "/" });
  assert.deepEqual(robotsRules(null), { userAgent: "*", allow: "/" });
});

test("a disallow-all beta robots file advertises no sitemap while production still does", () => {
  assert.equal(robotsFile("beta").sitemap, undefined, "a disallowed origin must not hand crawlers a URL list");
  assert.deepEqual(robotsFile("beta").rules, { userAgent: "*", disallow: "/" });
  for (const environment of ["production", null] as const) {
    assert.match(String(robotsFile(environment).sitemap), /\/sitemap\.xml$/);
  }
});

test("an accepted email is never described as delivered", () => {
  assert.equal(emailReceiptLabel({ email: "sent" }), "Delivered");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "held" }), "Held pending delivery activation or review");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "queued" }), "Waiting to be sent");
  assert.match(emailReceiptLabel({ email: "pending", emailDelivery: "accepted" }), /not confirmed/);
  assert.doesNotMatch(emailReceiptLabel({ email: "pending", emailDelivery: "accepted" }), /^Delivered$/);
  assert.equal(emailReceiptLabel({ email: "setup_required", emailDelivery: "queued" }), "Email is not connected yet");
  assert.equal(emailReceiptLabel({ email: "needs_review", emailDelivery: "bounced" }), "Delivery needs maintainer review");
  // An older receipt predates the provider field, and an unknown state must claim nothing.
  assert.equal(emailReceiptLabel({ email: "pending" }), "Not delivered yet");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "something_new" }), "Not delivered yet");
});

test("a held issue job is never described as queued", () => {
  // Reachable state: with no activation cutoff the drain holds every pending job, GitHub included,
  // while `issue` still reads "pending" because GitHub itself is configured.
  assert.equal(issueReceiptLabel({ issue: "pending", issueDelivery: "held" }), "Held pending delivery activation or review");
  assert.equal(issueReceiptLabel({ issue: "pending", issueDelivery: "pending" }), "Waiting to be created");
  assert.equal(issueReceiptLabel({ issue: "pending", issueDelivery: "processing" }), "Being created now");
  assert.equal(issueReceiptLabel({ issue: "created", issueDelivery: "done" }), "Created");
  assert.equal(issueReceiptLabel({ issue: "setup_required", issueDelivery: "held" }), "Issue tracker is not connected yet");
  assert.equal(issueReceiptLabel({ issue: "needs_review", issueDelivery: "needs_review" }), "Needs maintainer review");
  // A receipt from before this field, and any state this build does not know, claim nothing.
  assert.equal(issueReceiptLabel({ issue: "pending" }), "Not created yet");
  assert.equal(issueReceiptLabel({ issue: "pending", issueDelivery: "something_new" }), "Not created yet");
  for (const label of [
    issueReceiptLabel({ issue: "pending", issueDelivery: "held" }),
    issueReceiptLabel({ issue: "pending" }),
    issueReceiptLabel({ issue: "setup_required" }),
  ]) assert.doesNotMatch(label, /queued/i, "an unconfigured, held or unknown job is never called queued");
});

test("a report's release identifier passes the same shape check as an analytics payload", () => {
  assert.equal(releaseIdentifier(SHA), SHA);
  assert.equal(releaseIdentifier(undefined), "development");
  for (const malformed of ["", "0.2.0", SHA.toUpperCase(), `${SHA}extra`, "not-a-sha"]) {
    assert.equal(releaseIdentifier(malformed), "development", `"${malformed}" must not reach a report body`);
  }
});

test("the contact surface publishes only the public address, and GitHub either way", () => {
  const enabled = renderToStaticMarkup(React.createElement(CreatorPage, { contactEnabled: true }));
  const disabled = renderToStaticMarkup(React.createElement(CreatorPage, { contactEnabled: false }));
  assert.equal([...enabled.matchAll(/mailto:([^"]+)/g)].map(match => match[1]).join(), "hello@cojeev.com,hello@cojeev.com");
  assert.match(enabled, /href="https:\/\/github\.com\/luv-jeri"/);
  assert.doesNotMatch(disabled, /mailto:/, "an unverified inbox is never published");
  assert.match(disabled, /href="https:\/\/github\.com\/luv-jeri"/);
});
