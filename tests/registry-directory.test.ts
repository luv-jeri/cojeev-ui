/**
 * The shadcn Registry Directory ranks listed registries (shadcn-ui/ui #12058):
 * health score first, then distinct item names up to 500. Two of its inputs
 * live in this build output, so they are pinned here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { registryItemSchema, registrySchema } from "shadcn/schema";

const index = JSON.parse(fs.readFileSync("registry.json", "utf8"));
const names: string[] = index.items.map((item: { name: string }) => item.name);

test("the index carries the directory namespace and enough distinct names", () => {
  assert.equal(registrySchema.safeParse(index).success, true);
  // The health monitor lowercases both sides and strips "@" before comparing.
  assert.equal(index.name, "000h-cojeev");
  assert.equal(new Set(names).size, names.length, "duplicate names lose setup points");
  assert.ok(names.length >= 500, `size bonus caps at 500 distinct names; have ${names.length}`);
});

test("every Lucide name is an installable typed component outside the UI catalogue", () => {
  const item = JSON.parse(fs.readFileSync("public/r/icon-activity.json", "utf8"));
  assert.equal(registryItemSchema.safeParse(item).success, true);
  assert.equal(item.type, "registry:component");
  assert.ok(item.registryDependencies.some((d: string) => d.endsWith("/r/icon.json")));
  assert.equal(item.files[0].target, "components/icons/activity.tsx");
  assert.match(item.files[0].content, /from "@\/components\/ui\/icon"/);
  assert.match(item.files[0].content, /export function ActivityIcon\(/);
  // CI's `git diff --exit-code` ignores untracked files, so a payload that was
  // generated but never committed would slip through; check each one exists.
  const lucide = [...new Set(fs.readFileSync("registry/cojeev/lib/lucide-icon-names.ts", "utf8").match(/"[a-z0-9-]+"/g)!.map((s) => s.slice(1, -1)))].sort();
  assert.deepEqual(names.filter((name) => name.startsWith("icon-")), lucide.map((name) => `icon-${name}`));
  for (const name of lucide) {
    const payload = JSON.parse(fs.readFileSync(`public/r/icon-${name}.json`, "utf8"));
    assert.equal(payload.name, `icon-${name}`);
    assert.equal(registryItemSchema.safeParse(payload).success, true, `icon-${name} payload is invalid`);
  }
  assert.ok(!index.items.some((i: { type: string; name: string }) => i.type === "registry:ui" && i.name.startsWith("icon-")), "icon items must stay out of the registry:ui catalogue");
});
