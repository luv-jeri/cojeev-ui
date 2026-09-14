import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rename, realpath, chmod } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { mergeTrafficSnapshot } from "./lib/github-traffic.mjs";

const repository = "luv-jeri/cojeev-ui";
const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9) ?? join(homedir(), ".local/share/cojeev-ui-analytics/traffic.json");
if (!isAbsolute(output)) throw new Error("Choose an absolute private output path outside the repository.");
await mkdir(dirname(output), { recursive: true, mode: 0o700 });
const destination = join(await realpath(dirname(output)), output.split("/").at(-1));
const checkout = await realpath(process.cwd());
const withinCheckout = relative(checkout, destination);
if (!withinCheckout.startsWith("..") && !isAbsolute(withinCheckout)) throw new Error("Traffic history must be stored outside the public repository.");

function api(path) {
  return JSON.parse(execFileSync("gh", ["api", `repos/${repository}${path}`, "-H", "Accept: application/vnd.github+json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }));
}
let previous = null;
try { previous = JSON.parse(await readFile(destination, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const snapshot = { clones: api("/traffic/clones?per=day"), views: api("/traffic/views?per=day"), repository: api("") };
const result = mergeTrafficSnapshot(previous, repository, snapshot, new Date().toISOString());
const temporary = resolve(`${destination}.${randomUUID()}.tmp`);
await writeFile(temporary, JSON.stringify(result, null, 2) + "\n", { mode: 0o600, flag: "wx" });
await rename(temporary, destination);
await chmod(destination, 0o600);
console.log(`Saved private traffic snapshot to ${destination}. Overlapping UTC days were replaced, not added.`);
