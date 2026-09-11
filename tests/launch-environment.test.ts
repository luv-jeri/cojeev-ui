import test from "node:test";
import assert from "node:assert/strict";
import { readSiteFlags } from "../lib/site-config";
import { robotsRules } from "../app/robots";
import { emailReceiptLabel } from "../lib/reporting/receipt-labels";

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

test("an accepted email is never described as delivered", () => {
  assert.equal(emailReceiptLabel({ email: "sent" }), "Delivered");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "held" }), "Held until email delivery is switched on");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "queued" }), "Waiting to be sent");
  assert.match(emailReceiptLabel({ email: "pending", emailDelivery: "accepted" }), /not confirmed/);
  assert.doesNotMatch(emailReceiptLabel({ email: "pending", emailDelivery: "accepted" }), /^Delivered$/);
  assert.equal(emailReceiptLabel({ email: "setup_required", emailDelivery: "queued" }), "Email is not connected yet");
  assert.equal(emailReceiptLabel({ email: "needs_review", emailDelivery: "bounced" }), "Delivery needs maintainer review");
  // An older receipt predates the provider field, and an unknown state must claim nothing.
  assert.equal(emailReceiptLabel({ email: "pending" }), "Not delivered yet");
  assert.equal(emailReceiptLabel({ email: "pending", emailDelivery: "something_new" }), "Not delivered yet");
});
