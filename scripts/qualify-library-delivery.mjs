/**
 * Qualify a local registry candidate in one fresh Vite consumer. The consumer
 * is measured first with Button alone, then with the Projects component set.
 * It also exercises both materialized Cojeev fonts under a self-only CSP.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { gzipSync } from "node:zlib";

const getArgument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const output = path.resolve(getArgument("output") ?? "artifacts/library-integration/delivery-qualification.json");
const logDirectory = path.join(path.dirname(output), "delivery-logs");
const root = process.cwd();
const buttonNames = ["button"];
const projectsNames = ["button", "icon", "input", "tabs", "item", "activity-feed", "tree"];
const canonicalFonts = new Map([
  ["511199053bc63da8002f95cebf6d8254c0838d7c3515db9a6d92a579ac81eef8", "DM Sans"],
  ["732d894c80980fc12f0c5dd955f5e917a6ffefb666553a7cee25a00b058b6368", "Bricolage Grotesque"],
]);
const mime = { ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".html": "text/html" };
const commands = [];
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
let npmCache;

fs.rmSync(logDirectory, { recursive: true, force: true });
const registryFiles = new Map(
  fs.readdirSync(path.join(root, "public/r"))
    .filter(file => /^[a-z0-9-]+\.json$/.test(file))
    .map(file => [file.slice(0, -5), fs.readFileSync(path.join(root, "public/r", file))]),
);
const registry = new Map([...registryFiles].map(([name, bytes]) => [name, JSON.parse(bytes.toString("utf8"))]));

const run = (label, command, args, cwd, timeout = 120_000) => new Promise((resolve, reject) => {
  const started = performance.now();
  const log = path.join(logDirectory, `${String(commands.length + 1).padStart(2, "0")}-${label}.log`);
  const child = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "true", npm_config_cache: npmCache },
  });
  let transcript = "";
  child.stdout.on("data", chunk => { transcript += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", chunk => { transcript += chunk; process.stderr.write(chunk); });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeout);
  const finish = (exit, error) => {
    clearTimeout(timer);
    fs.mkdirSync(logDirectory, { recursive: true });
    if (error) transcript += `\n${error.stack}\n`;
    fs.writeFileSync(log, `${transcript}\n[exit ${exit}${timedOut ? "; timeout" : ""}]\n`);
    commands.push({
      label,
      exit,
      timeout: timedOut,
      seconds: Number(((performance.now() - started) / 1000).toFixed(2)),
      log: path.relative(path.dirname(output), log),
    });
  };
  child.once("error", error => { finish("spawn-error", error); reject(error); });
  child.once("close", code => {
    if (commands.at(-1)?.label !== label) finish(code ?? 1);
    if (code === 0) resolve();
    else reject(new Error(`${label} ${timedOut ? `timed out after ${timeout / 1000}s` : `exited ${code}`}`));
  });
});

const write = (directory, file, contents) => {
  const target = path.join(directory, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
};

const localRegistry = createServer((request, response) => {
  const name = request.url?.match(/^\/r\/([a-z0-9-]+)\.json$/)?.[1];
  if (!name || !registry.has(name)) return response.writeHead(404).end();
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(registry.get(name)));
});

await new Promise((resolve, reject) => {
  localRegistry.once("error", reject);
  localRegistry.listen(0, "127.0.0.1", resolve);
});
const origin = `http://127.0.0.1:${localRegistry.address().port}`;
for (const item of registry.values()) {
  item.registryDependencies = (item.registryDependencies ?? []).map(value => {
    const name = value.match(/\/r\/([a-z0-9-]+)\.json$/)?.[1];
    if (!name || !registry.has(name)) throw new Error(`Candidate dependency is unavailable locally: ${value}`);
    return `${origin}/r/${name}.json`;
  });
  if (item.config?.registries?.["@cojeev"]) item.config.registries["@cojeev"] = `${origin}/r/{name}.json`;
}

const consumer = await fsp.mkdtemp(path.join(os.tmpdir(), "cojeev-library-delivery-"));
npmCache = process.env.npm_config_cache ? path.resolve(process.env.npm_config_cache) : path.join(consumer, ".npm-cache");
let browser;
let site;
let qualified = false;
try {
  write(consumer, "package.json", JSON.stringify({
    name: "cojeev-delivery-candidate",
    private: true,
    type: "module",
    scripts: { build: "tsc --noEmit && vite build" },
    dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
    devDependencies: {
      "@types/node": "^22.0.0",
      "@types/react": "^19.2.0",
      "@types/react-dom": "^19.2.0",
      "@tailwindcss/vite": "^4.1.0",
      "@vitejs/plugin-react": "^5.0.0",
      tailwindcss: "^4.1.0",
      typescript: "^5.9.2",
      vite: "^7.1.0",
    },
  }, null, 2));
  write(consumer, "tsconfig.json", JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      paths: { "@/*": ["./src/*"] },
    },
    include: ["src", "vite.config.ts"],
  }, null, 2));
  write(consumer, "vite.config.ts", `import {defineConfig,type Plugin} from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {fileURLToPath,URL} from "node:url";
type MeasuredModule={isEntry:boolean;importedIds:readonly string[];dynamicallyImportedIds:readonly string[];renderedBytes:number;chunks:string[]};
function measuredModuleGraph():Plugin{return{name:"measured-module-graph",generateBundle(_options,bundle){const modules:Record<string,MeasuredModule>=Object.fromEntries([...this.getModuleIds()].map(id=>{const info=this.getModuleInfo(id);return[id,{isEntry:info?.isEntry??false,importedIds:info?.importedIds??[],dynamicallyImportedIds:info?.dynamicallyImportedIds??[],renderedBytes:0,chunks:[]}]}));for(const [fileName,output] of Object.entries(bundle)){if(output.type!=="chunk")continue;for(const [id,cost] of Object.entries(output.modules)){modules[id]??={isEntry:false,importedIds:[],dynamicallyImportedIds:[],renderedBytes:0,chunks:[]};modules[id].renderedBytes+=cost.renderedLength;modules[id].chunks.push(fileName)}}this.emitFile({type:"asset",fileName:"module-graph.json",source:JSON.stringify({modules})})}}}
export default defineConfig({plugins:[react(),tailwindcss(),measuredModuleGraph()],build:{manifest:true},resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});
`);
  write(consumer, "index.html", '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
  write(consumer, "src/main.tsx", 'import {createRoot} from "react-dom/client";import App from "./App";import "./index.css";createRoot(document.getElementById("root")!).render(<App/>);\n');
  write(consumer, "src/index.css", '@import "tailwindcss";\n');

  await run("npm-install", "npm", ["install"], consumer);
  await run("shadcn-init", "npx", ["--yes", "shadcn@4.21.0", "init", "--template", "vite", "--base", "radix", "--preset", "nova", "--no-monorepo", "--yes"], consumer);
  await run("shadcn-add-button", "npx", ["--yes", "shadcn@4.21.0", "add", `${origin}/r/button.json`, "--yes", "--overwrite"], consumer);
  await run("materialize-fonts", process.execPath, ["src/scripts/cojeev-materialize-fonts.mjs", "--css", "src/styles/cojeev-fonts.css"], consumer);
  fs.appendFileSync(path.join(consumer, "src/index.css"), '@import "./styles/cojeev-fonts.css";\n');
  write(consumer, "src/App.tsx", `import {Button} from "@/components/ui/button";
export default function App(){return <main style={{padding:24}}><Button>Save</Button><p data-font="dm" style={{fontFamily:"DM Sans"}}>DM Sans probe</p><p data-font="bricolage" style={{fontFamily:"Bricolage Grotesque"}}>Bricolage Grotesque probe</p></main>}
`);
  await run("button-build", "npm", ["run", "build"], consumer);
  const profiles = { button: measureProfile(consumer, "button", buttonNames) };

  const remainingNames = projectsNames.filter(name => name !== "button");
  await run("shadcn-add-projects", "npx", ["--yes", "shadcn@4.21.0", "add", ...remainingNames.map(name => `${origin}/r/${name}.json`), "--yes", "--overwrite"], consumer);
  // The later registry add refreshes the active foundation stylesheet back to
  // its default embedded form. Exercise the opt-in again on that final copy.
  await run("rematerialize-fonts", process.execPath, ["src/scripts/cojeev-materialize-fonts.mjs", "--css", "src/styles/cojeev-fonts.css"], consumer);
  write(consumer, "src/App.tsx", `import * as React from "react";
import {Button} from "@/components/ui/button";import {IconButton} from "@/components/ui/icon";import {Input} from "@/components/ui/input";import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";import {Item} from "@/components/ui/item";import {ActivityFeed} from "@/components/ui/activity-feed";import {Tree} from "@/components/ui/tree";
export default function App(){const [expanded,setExpanded]=React.useState(["folder"]);return <main style={{padding:24}}><h1 data-font="bricolage" style={{fontFamily:"Bricolage Grotesque"}}>Projects</h1><p data-font="dm" style={{fontFamily:"DM Sans"}}>Local project controls</p><Button>Save</Button><IconButton aria-label="More">+</IconButton><Input aria-label="Name"/><Tabs defaultValue="one"><TabsList><TabsTrigger value="one">One</TabsTrigger></TabsList><TabsContent value="one">Content</TabsContent></Tabs><Item>Project item</Item><ActivityFeed entries={[{id:"a",title:"Created project"}]}/><Tree aria-label="Projects" nodes={[{id:"folder",label:"Project",kind:"folder",children:[{id:"readme",label:"README.md",kind:"file"}]}]} expandedIds={expanded} selectedId="readme" onExpandedChange={(id,open)=>setExpanded(open?[id]:[])} onSelectionChange={()=>{}}/></main>}
`);
  await run("projects-build", "npm", ["run", "build"], consumer);
  profiles.projects = measureProfile(consumer, "projects", projectsNames);

  site = createStaticServer(path.join(consumer, "dist"));
  await new Promise((resolve, reject) => {
    site.once("error", reject);
    site.listen(0, "127.0.0.1", resolve);
  });
  const siteOrigin = `http://127.0.0.1:${site.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allRequests = [];
  const fontRequests = [];
  page.on("request", request => {
    allRequests.push(request.url());
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.goto(siteOrigin, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('16px "DM Sans"'),
      document.fonts.load('16px "Bricolage Grotesque"'),
    ]);
    await document.fonts.ready;
  });
  assertSelfOnly(allRequests, fontRequests, siteOrigin);
  const loaded = await page.evaluate(() => ({
    dmSans: document.fonts.check('16px "DM Sans"', "DM Sans probe"),
    bricolageGrotesque: document.fonts.check('16px "Bricolage Grotesque"', "Bricolage Grotesque probe"),
  }));
  if (!loaded.dmSans || !loaded.bricolageGrotesque) throw new Error("Browser did not load both materialized Cojeev font faces.");
  const requestedFontAssets = fontRequests.map(url => new URL(url).pathname);
  for (const expected of ["dm-sans-variable", "bricolage-grotesque-variable"]) {
    if (!requestedFontAssets.some(file => file.includes(expected))) throw new Error(`Browser did not request ${expected}.woff2.`);
  }

  const registryJson = Object.fromEntries(projectsNames.concat("cojeev").map(name => {
    const bytes = registryFiles.get(name);
    return [name, { rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: sha256(bytes) }];
  }));
  const registryJsonTotals = Object.values(registryJson).reduce(
    (total, file) => ({ rawBytes: total.rawBytes + file.rawBytes, gzipBytes: total.gzipBytes + file.gzipBytes }),
    { rawBytes: 0, gzipBytes: 0 },
  );
  const sourceFiles = [
    "registry/cojeev/scripts/materialize-fonts.mjs",
    "registry/cojeev/styles/fonts.css",
    "app/fonts/dm-sans-variable.woff2",
    "app/fonts/bricolage-grotesque-variable.woff2",
  ];
  const evidence = {
    candidate: {
      installer: "shadcn@4.21.0",
      sequence: ["fresh consumer", "Button profile", "Projects profile"],
      projectsComponents: projectsNames,
      registryOverride: "loopback candidate (not the published registry)",
      installedHelperPath: "src/scripts/cojeev-materialize-fonts.mjs",
    },
    commands,
    installedRegistryJson: { files: registryJson, totals: registryJsonTotals },
    profiles,
    fontCsp: {
      policy: "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'none'; img-src 'self'",
      requests: requestedFontAssets,
      loaded,
      externalRequests: allRequests.filter(url => new URL(url).origin !== siteOrigin),
    },
    sourceQualification: {
      baseCommit: resolveGitHead(),
      files: Object.fromEntries(sourceFiles.map(file => [file, sha256(fs.readFileSync(path.join(root, file)))])),
      canonicalFontSha256: Object.fromEntries([...canonicalFonts].map(([hash, family]) => [family, hash])),
    },
    limits: [
      "Installed registry JSON bytes are reported separately from emitted bundle bytes.",
      "Cojeev font bytes are identified by canonical SHA-256; preset Geist files are excluded from Cojeev font totals.",
      "The Projects JS chunk exceeds Vite's 500 kB warning threshold; the threshold was not changed.",
      "No startup-time or performance-score claim is made; I-04 remains measured and open for owner-led optimization.",
    ],
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
  qualified = true;
  console.log(`Qualified local consumer delivery: ${output}`);
} finally {
  await browser?.close();
  await new Promise(resolve => site ? site.close(resolve) : resolve());
  await new Promise(resolve => localRegistry.close(resolve));
  if (qualified) await fsp.rm(consumer, { recursive: true, force: true });
  else console.error(`Candidate retained for diagnosis: ${consumer}`);
}

function measureProfile(directory, profile, components) {
  const dist = path.join(directory, "dist");
  const files = [];
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) walk(file);
      else files.push(file);
    }
  };
  walk(dist);
  const emitted = files
    .filter(file => [".js", ".css", ".woff2"].includes(path.extname(file)))
    .map(file => {
      const bytes = fs.readFileSync(file);
      const hash = sha256(bytes);
      const family = canonicalFonts.get(hash);
      return {
        kind: path.extname(file).slice(1),
        file: path.relative(dist, file),
        rawBytes: bytes.length,
        gzipBytes: gzipSync(bytes).length,
        ...(path.extname(file) === ".woff2" ? {
          sha256: hash,
          ownership: family ? "cojeev-library" : file.includes("geist-") ? "consumer-preset" : "other",
          ...(family ? { family } : {}),
        } : {}),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
  const totals = Object.fromEntries(["js", "css", "woff2"].map(kind => [kind, sumFiles(emitted.filter(file => file.kind === kind))]));
  const libraryFonts = emitted.filter(file => file.kind === "woff2" && file.ownership === "cojeev-library");
  const otherFonts = emitted.filter(file => file.kind === "woff2" && file.ownership !== "cojeev-library");
  const rawGraph = JSON.parse(fs.readFileSync(path.join(dist, "module-graph.json"), "utf8"));
  return {
    profile,
    components,
    emitted,
    totals,
    fontTotals: {
      cojeevLibrary: sumFiles(libraryFonts),
      consumerPresetAndOther: sumFiles(otherFonts),
    },
    importCostGraph: sanitizeGraph(rawGraph.modules, directory),
  };
}

function sumFiles(files) {
  return files.reduce(
    (total, file) => ({ rawBytes: total.rawBytes + file.rawBytes, gzipBytes: total.gzipBytes + file.gzipBytes }),
    { rawBytes: 0, gzipBytes: 0 },
  );
}

function sanitizeGraph(modules, directory) {
  const normalized = new Map(Object.keys(modules).map(id => [id, sanitizeModuleId(id, directory)]));
  const copiedSource = Object.entries(modules)
    .filter(([id]) => normalized.get(id).startsWith("consumer/src/"))
    .map(([id, info]) => ({
      module: normalized.get(id),
      renderedJsBytes: info.renderedBytes,
      chunks: info.chunks,
      imports: info.importedIds.map(imported => normalized.get(imported) ?? sanitizeModuleId(imported, directory)),
      dynamicImports: info.dynamicallyImportedIds.map(imported => normalized.get(imported) ?? sanitizeModuleId(imported, directory)),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
  const dependencyCosts = new Map();
  for (const [id, info] of Object.entries(modules)) {
    const normalizedId = normalized.get(id);
    if (!normalizedId.startsWith("npm/")) continue;
    const packageName = npmPackageName(normalizedId.slice(4));
    dependencyCosts.set(packageName, (dependencyCosts.get(packageName) ?? 0) + info.renderedBytes);
  }
  return {
    copiedSource,
    dependencyRenderedJsBytes: Object.fromEntries([...dependencyCosts].sort((a, b) => b[1] - a[1])),
    note: "Rendered JS bytes are Rollup module contributions before gzip; emitted file gzip totals are measured separately.",
  };
}

function sanitizeModuleId(id, directory) {
  const virtual = id.startsWith("\0");
  const clean = id.replace(/^\0+/, "");
  const consumerRoots = [...new Set([directory, fs.realpathSync(directory)])];
  for (const consumerRoot of consumerRoots) {
    const nodeModules = `${consumerRoot}${path.sep}node_modules${path.sep}`;
    if (clean.startsWith(nodeModules)) return `${virtual ? "virtual:" : ""}npm/${clean.slice(nodeModules.length).split(path.sep).join("/")}`;
    if (clean.startsWith(`${consumerRoot}${path.sep}`)) return `${virtual ? "virtual:" : ""}consumer/${clean.slice(consumerRoot.length + 1).split(path.sep).join("/")}`;
  }
  if (!path.isAbsolute(clean)) return `${virtual ? "virtual:" : ""}${clean}`;
  return `${virtual ? "virtual:" : ""}external/${path.basename(clean)}-${sha256(Buffer.from(clean)).slice(0, 8)}`;
}

function npmPackageName(modulePath) {
  const parts = modulePath.split("/");
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

function createStaticServer(dist) {
  return createServer((request, response) => {
    const requested = new URL(request.url ?? "/", "http://localhost").pathname;
    const file = path.resolve(dist, `.${requested === "/" ? "/index.html" : requested}`);
    if (!file.startsWith(`${dist}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return response.writeHead(404).end();
    response.setHeader("content-type", mime[path.extname(file)] ?? "application/octet-stream");
    response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'none'; img-src 'self'");
    response.end(fs.readFileSync(file));
  });
}

function assertSelfOnly(allRequests, fontRequests, origin) {
  if (fontRequests.length < 2) throw new Error("Browser made fewer than two font requests; both materialized faces were not exercised.");
  if (allRequests.some(url => new URL(url).origin !== origin)) throw new Error("A candidate request escaped the self-only origin.");
  if (fontRequests.some(url => !url.endsWith(".woff2"))) throw new Error("A font request did not target a WOFF2 file.");
}

function resolveGitHead() {
  const dotGit = path.join(root, ".git");
  const gitFile = fs.statSync(dotGit).isFile() ? fs.readFileSync(dotGit, "utf8") : "";
  const linked = gitFile.match(/^gitdir: (.+)$/m)?.[1];
  const gitDirectory = linked ? path.resolve(root, linked) : dotGit;
  const commonDirectory = fs.existsSync(path.join(gitDirectory, "commondir"))
    ? path.resolve(gitDirectory, fs.readFileSync(path.join(gitDirectory, "commondir"), "utf8").trim())
    : gitDirectory;
  const reference = fs.readFileSync(path.join(gitDirectory, "HEAD"), "utf8").trim();
  if (!reference.startsWith("ref: ")) return reference;
  const ref = reference.slice(5);
  const loose = path.join(commonDirectory, ref);
  if (fs.existsSync(loose)) return fs.readFileSync(loose, "utf8").trim();
  const packed = fs.readFileSync(path.join(commonDirectory, "packed-refs"), "utf8").split("\n").find(line => line.endsWith(` ${ref}`));
  if (!packed) throw new Error(`Cannot resolve Git source reference ${ref}.`);
  return packed.split(" ")[0];
}
