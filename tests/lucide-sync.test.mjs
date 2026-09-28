import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

test("the committed Lucide geometry and name list match the pinned pack",()=>{
  const result=spawnSync(process.execPath,["scripts/sync-lucide-icons.mjs","--check"],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
});
