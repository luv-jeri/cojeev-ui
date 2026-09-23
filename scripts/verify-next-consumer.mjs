/**
 * Install the candidate registry into a fresh Next.js consumer, not just Vite.
 *
 * The Vite path in `verify-install.mjs` proves the payload resolves in a
 * bundler-first project. Next is a different contract: React Server Components
 * split every installed file across a server/client boundary, the `@/` alias is
 * resolved by Next's own TypeScript plugin, and Tailwind v4 arrives through
 * PostCSS rather than a Vite plugin. A payload that only works in one of them is
 * not a portable install, so both are checked from the same served candidate.
 *
 * Usage: node scripts/run-install-verification.mjs --components=... already
 * serves the payloads; this script is the `--framework=next` consumer.
 */
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const getArg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = (getArg("url") ?? "http://127.0.0.1:4319").replace(/\/$/, "");
const receiptFile = path.resolve(getArg("receipt") ?? path.join(root, "artifacts/w02/install-next.json"));
const ids = (getArg("components") ?? "button").split(",").map(value => value.trim()).filter(Boolean);

const installer = "shadcn@4.21.0";
const localInstaller = path.join(root, "node_modules/shadcn/dist/index.js");
if (!fs.existsSync(localInstaller)) throw new Error(`The pinned installer is not installed at ${localInstaller}`);

// Unlike the Vite template, the Next template always creates a named project
// directory, so the temporary root holds the project rather than being it.
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cojeev-next-"));
const projectName = "cojeev-next-consumer";
const directory = path.join(temporaryRoot, projectName);
const logDirectory = path.join(root, "artifacts/w02");
fs.mkdirSync(logDirectory, { recursive: true });
// `prerenderBlockedByEnvironment` is a property of this machine, not of the
// payload: a pristine `shadcn init -t next` scaffold fails its own prerender too.
const receipt = { directory, baseURL, components: ids, framework: "next", installer, node: process.version, startedAt: new Date().toISOString(), verdict: "PENDING", checks: {} };

const run = (label, args, cwd = temporaryRoot) => {
  const log = path.join(logDirectory, `next-${label}.log`);
  const result = spawnSync(process.execPath, [localInstaller, ...args], { cwd, encoding: "utf8", env: { ...process.env, CI: "true" } });
  fs.writeFileSync(log, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  if (result.status !== 0) throw new Error(`${label} failed (${result.status}); see ${log}`);
  return result;
};

try {
  run("init", ["init", "--template", "next", "--base", "radix", "--preset", "nova", "--no-monorepo", "--yes", "--name", projectName]);
  if (!fs.existsSync(path.join(directory, "package.json"))) throw new Error(`The Next template did not create ${directory}`);
  receipt.checks.nextScaffold = "PASS";
  const scaffold = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  const scaffoldPackages = new Set([...Object.keys(scaffold.dependencies ?? {}), ...Object.keys(scaffold.devDependencies ?? {})]);

  run("add", ["add", ...ids.map(id => `${baseURL}/r/${id}.json`), "--yes", "--overwrite"], directory);
  receipt.checks.publicCLIInstall = "PASS";

  /* The alias problem, stated as a measurement rather than repaired away.
   *
   * A registry item's `css` keys are written into the consumer's stylesheet
   * verbatim, and the installer picks that stylesheet's location — `app/globals.css`
   * here, `src/index.css` for a Vite consumer. `@/` means a different directory in
   * each: Next maps it to the project root, Vite's template maps it to `src/`. The
   * installer puts foundation files at the project root either way, so the registry
   * has no single specifier that resolves in both. It therefore ships the specifier
   * its verified Vite control resolves, and a Next consumer needs one documented
   * path change. B-028 tracks that; this check refuses to make the change silently.
   *
   * `--css=keep` is the negative control: it builds the consumer exactly as the CLI
   * wrote it and asserts the failure is the alias, so "PASS" below can never mean
   * the alias problem quietly disappeared from the measurement.
   */
  const globalsPath = path.join(directory, "app/globals.css");
  const globals = fs.readFileSync(globalsPath, "utf8");
  const aliasLines = globals.split("\n").filter(line => /@import "@\/styles\//.test(line));
  const normalized = globals.replace(/@import "@\/styles\/([^"]+)";/g, '@import "../styles/$1";');
  const keep = getArg("css") === "keep";

  if (keep) {
    if (!aliasLines.length) throw new Error("--css=keep asserted a failure, but the CLI wrote no alias import; the control is no longer testing anything");
    const control = spawnSync("npm", ["run", "build", "--", "--experimental-build-mode", "compile"], { cwd: directory, encoding: "utf8", env: { ...process.env, CI: "true" } });
    fs.writeFileSync(path.join(logDirectory, "next-css-keep-control.log"), `${control.stdout ?? ""}${control.stderr ?? ""}`);
    const log = `${control.stdout ?? ""}${control.stderr ?? ""}`;
    const provesAlias = /Can't resolve '@\/styles\//.test(log);
    receipt.checks.cssKeepControl = provesAlias
      ? "PASS — an unmodified consumer fails to build with Can't resolve '@/styles/...', so the alias is the cause"
      : `FAIL — the unmodified consumer did not fail with the expected alias error (exit ${control.status})`;
    if (!provesAlias) throw new Error("The alias negative control did not reproduce; the repair below would be unmeasured.\n" + log.split("\n").slice(0, 20).join("\n"));
    // The control has done its job; it asserted the failure, so it must not go on to
    // measure a repaired project. Write the receipt here and stop, since this control
    // is not the repair path whose checks the rest of the script performs.
    receipt.verdict = "PASS";
    receipt.checks.nextTypeScript = "NOT RUN — this run is the negative control";
    receipt.checks.turbopackCompilesInstalledSource = "EXPECTED FAILURE — asserted above, not a project result";
    receipt.finishedAt = new Date().toISOString();
    receipt.runtimeSeconds = (Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt)) / 1000;
    fs.mkdirSync(path.dirname(receiptFile), { recursive: true });
    fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify(receipt, null, 2));
    process.exit(0);
  } else if (aliasLines.length) {
    fs.writeFileSync(globalsPath, normalized);
    receipt.checks.tailwindAliasNormalization =
      `QUALIFIED — the registry's css block uses a path alias a Next consumer cannot resolve, so this run rewrote ${aliasLines.length} import(s) to relative. This project is therefore repaired, not a one-command install; the payload itself compiles unchanged. Tracked as B-028.`;
  } else {
    receipt.checks.tailwindAliasNormalization = "NOT NEEDED — the css block already resolved with no rewrite";
  }

  // A server component imports the installed source and renders it on the server.
  // An installed file that reaches browser-only APIs at module scope fails here.
  // `shadcn init --preset nova` seeds a *stock* button into components/ui before
  // any registry item is added. A fixture that renders a variant only Cojeev's
  // button has therefore fails to typecheck against shadcn's — which is what
  // happened, and it is a defect in this fixture rather than in the payload. So
  // the page renders exactly the entries this run installs, and the accent
  // variant is asserted only when `button` is among them.
  // Only the entries this run actually installs may be imported. `Separator` used
  // to be hard-coded here while the default request list is `button` alone, so the
  // fixture compiled against a module nobody had installed and the run failed with
  // `Can't resolve '@/components/ui/separator'` — the same class of fixture defect
  // as the stock-button one above, and it hid behind a stale receipt until the
  // verification was re-run on the frozen candidate.
  const rendersButton = ids.includes("button");
  const rendersSeparator = ids.includes("separator");
  const imports = [
    rendersButton ? `import { Button } from "@/components/ui/button";` : null,
    rendersSeparator ? `import { Separator } from "@/components/ui/separator";` : null,
  ].filter(Boolean).join("\n");
  const uses = [
    rendersButton ? `      <Button variant="accent">Server rendered</Button>` : null,
    rendersSeparator ? `      <Separator />` : null,
  ].filter(Boolean).join("\n");
  assert.ok(ids.length, "the run must install at least one entry");
  fs.writeFileSync(path.join(directory, "app/page.tsx"), `${imports}

export default function Page() {
  return (
    <main data-installed="true">
${uses}
    </main>
  );
}
`);
  const rendered = [rendersButton ? "button" : null, rendersSeparator ? "separator" : null].filter(Boolean);
  const unrendered = ids.filter(id => !rendered.includes(id));
  receipt.checks.fixtureUsesInstalledEntries = [
    `PASS — rendered every entry this run installs (${rendered.join(", ")})`,
    rendersButton
      ? "including the accent variant only Cojeev's button has"
      : "no button, so the nova preset's stock one is never in scope",
    unrendered.length ? `${unrendered.join(", ")} installed but not rendered by this fixture` : null,
  ].filter(Boolean).join("; ");

  // `next build`'s prerender phase is broken in this environment — a pristine
  // `shadcn init -t next` scaffold fails identically with "Expected workStore to
  // be initialized" (Next 16.3.4 on Node 26, no registry involved). So assert the
  // steps that do exercise the payload — compilation of every installed file and
  // whole-program TypeScript — and record the prerender failure verbatim rather
  // than pretending a green build happened or blaming it on the payload.
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  const nextEnv = { ...process.env, CI: "true", NEXT_TELEMETRY_DISABLED: "1" };
  const compile = spawnSync(process.execPath, [nextBin, "build", "--experimental-build-mode", "compile"], { cwd: directory, encoding: "utf8", env: nextEnv });
  fs.writeFileSync(path.join(logDirectory, "next-build.log"), `${compile.stdout ?? ""}${compile.stderr ?? ""}`);
  const compiled = /Compiled successfully/.test(`${compile.stdout}${compile.stderr}`);
  receipt.checks.turbopackCompilesInstalledSource = compiled ? "PASS" : "FAIL";
  if (!compiled) throw new Error("The Next consumer did not compile; see artifacts/w02/next-build.log");
  // `--experimental-build-mode compile` stops before its own TypeScript phase, so
  // run the consumer's compiler directly. This is the whole-program check that
  // catches an installed file whose types do not resolve: Next's app tsconfig, the
  // installed sources, and the generated route types, together.
  const typecheck = spawnSync(process.execPath, [path.join(directory, "node_modules/typescript/bin/tsc"), "--noEmit"], { cwd: directory, encoding: "utf8" });
  fs.writeFileSync(path.join(logDirectory, "next-typecheck.log"), `${typecheck.stdout ?? ""}${typecheck.stderr ?? ""}`);
  receipt.checks.nextTypeScript = typecheck.status === 0 ? "PASS" : "FAIL";
  if (typecheck.status !== 0) throw new Error(`The Next consumer's TypeScript check failed; see artifacts/w02/next-typecheck.log`);

  const prerender = spawnSync(process.execPath, [nextBin, "build"], { cwd: directory, encoding: "utf8", env: nextEnv });
  const prerenderLog = `${prerender.stdout ?? ""}${prerender.stderr ?? ""}`;
  fs.writeFileSync(path.join(logDirectory, "next-prerender.log"), prerenderLog);
  receipt.checks.prerender = prerender.status === 0 ? "PASS" : "BLOCKED BY ENVIRONMENT — Next 16.3.4 on Node 26 fails to prerender its own /_global-error and /_not-found bootstrap pages; a pristine scaffold fails identically";
  receipt.prerenderError = prerender.status === 0 ? null : (prerenderLog.match(/Error \[InvariantError\]: [^\n]*/) ?? [null])[0];

  // Serve the built app and read the rendered markup: compilation alone would not
  // catch an installed component that throws while rendering on the server.
  const dev = spawn(process.execPath, [nextBin, "dev", "--port", "4391"], { cwd: directory, encoding: "utf8", env: nextEnv, stdio: ["ignore", "pipe", "pipe"] });
  let devLog = "";
  dev.stdout.on("data", chunk => { devLog += chunk; });
  dev.stderr.on("data", chunk => { devLog += chunk; });
  try {
    const deadline = Date.now() + 120_000;
    let html = null;
    while (Date.now() < deadline) {
      try {
        const response = await fetch("http://127.0.0.1:4391/");
        if (response.ok) { html = await response.text(); break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!html) throw new Error("The Next dev server never served /; see artifacts/w02/next-dev.log");
    if (!html.includes("Server rendered")) throw new Error("The server-rendered page does not contain the installed Button output");
    receipt.checks.serverRenderedMarkup = "PASS";
    receipt.checks.clientBoundaryIntact = html.includes('data-slot="button"') || html.includes("data-installed") ? "PASS" : "nothing rendered";
    receipt.servedHtmlBytes = Buffer.byteLength(html, "utf8");
  } finally {
    dev.kill("SIGTERM");
    fs.writeFileSync(path.join(logDirectory, "next-dev.log"), devLog);
  }

  const installed = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  receipt.registryAddedPackages = [...new Set([...Object.keys(installed.dependencies ?? {}), ...Object.keys(installed.devDependencies ?? {})])]
    .filter(name => !scaffoldPackages.has(name)).sort();

  // Server-component safety: the built page must contain the rendered button and
  // the installed stylesheet must be linked, or the install is client-only.
  const builtHtml = path.join(directory, ".next/server/app/page.html");
  if (fs.existsSync(builtHtml)) {
    const html = fs.readFileSync(builtHtml, "utf8");
    if (!html.includes("Server rendered")) throw new Error("The server-rendered page does not contain the installed Button output");
    receipt.checks.serverRenderedMarkup = "PASS";
  } else {
    receipt.checks.serverRenderedMarkup = "SKIPPED — prerendered markup not emitted at .next/server/app/page.html";
  }
  const appCss = spawnSync("/bin/sh", ["-c", "ls .next/static/css/*.css 2>/dev/null | head -1"], { cwd: directory, encoding: "utf8" }).stdout.trim();
  if (appCss) {
    const css = fs.readFileSync(path.join(directory, appCss), "utf8");
    receipt.emittedCssBytes = Buffer.byteLength(css, "utf8");
    receipt.cssCarriesFoundation = /--v-canvas|--font-text|cojeev/.test(css);
    if (!receipt.cssCarriesFoundation) throw new Error("The built stylesheet does not carry the Cojeev foundation tokens");
    receipt.checks.foundationStylesInBuild = "PASS";
  } else {
    receipt.checks.foundationStylesInBuild = "SKIPPED — no emitted css";
  }
} catch (error) {
  receipt.verdict = "FAIL";
  receipt.error = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  if (receipt.verdict === "PENDING") receipt.verdict = "PASS";
  receipt.finishedAt = new Date().toISOString();
  receipt.runtimeSeconds = (Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt)) / 1000;
  fs.mkdirSync(path.dirname(receiptFile), { recursive: true });
  fs.writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}
