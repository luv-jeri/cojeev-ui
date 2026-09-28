import assert from "node:assert/strict";
import {register} from "node:module";
import {test} from "node:test";
import {loadLucideIcons} from "../registry/cojeev/ui/icon";

// The first request for the pack fails the way a dropped chunk does in a browser; later requests resolve normally.
register(`data:text/javascript,let failed=false;export async function resolve(specifier,context,next){if(!failed&&specifier.includes("lucide-icon-data")){failed=true;throw new Error("Failed to load chunk")}return next(specifier,context)}`);

test("a rejected pack load is retried on the next request",async()=>{
  await assert.rejects(loadLucideIcons(),/Failed to load chunk/);
  const pack=await loadLucideIcons();
  assert.ok(pack.getLucideIcon("anchor")?.length,"the retry loads real geometry");
});
