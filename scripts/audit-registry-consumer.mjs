/** Fresh local-registry install/build audit. Run with Node 22 after npm ci. */
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(
  root,
  process.argv[2] ?? `.work/installer-audit-${Date.now()}`,
);
const registry = path.join(output, "registry-source");
const consumer = path.join(output, "consumer");
const env = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`,
};
const receipt = { node: process.version, output, checks: {} };
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const write = async (file, content) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    typeof content === "string"
      ? content
      : `${JSON.stringify(content, null, 2)}\n`,
  );
};
async function run(name, executable, args, cwd, extraEnv = {}) {
  const log = [];
  console.log(`${name}…`);
  await new Promise((resolve, reject) => {
    const child = spawn("rtk", ["proxy", executable, ...args], {
      cwd,
      env: { ...env, ...extraEnv },
    });
    child.stdout.on("data", (chunk) => log.push(chunk.toString()));
    child.stderr.on("data", (chunk) => log.push(chunk.toString()));
    child.on("error", reject);
    child.on("close", async (code) => {
      await write(path.join(output, `${name}.log`), log.join(""));
      if (code) reject(new Error(`${name} exited ${code}; see ${name}.log`));
      else resolve();
    });
  });
  receipt.checks[name] = "PASS";
}
await fs.mkdir(output); // Refuse to overwrite an earlier consumer or receipt.
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const isConsumer = url.pathname.startsWith("/consumer/");
    const base = isConsumer
      ? path.join(consumer, "dist")
      : path.join(registry, "public");
    const relative = isConsumer
      ? url.pathname.slice("/consumer/".length)
      : url.pathname.slice(1);
    const file = path.resolve(base, relative || "index.html");
    if (!file.startsWith(`${base}${path.sep}`)) throw new Error("Invalid path");
    const types = {
      ".json": "application/json",
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
    };
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
    });
    response.end(await fs.readFile(file));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
let browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  receipt.registryURL = baseURL;
  for (const file of [
    "registry/sahajiv",
    "scripts/build-registry.mjs",
    "scripts/component-api.mjs",
    "reference/sahajiv-handoff-v4/data/registry.json",
    "reference/sahajiv-handoff-v4/fonts/DMSans-OFL.txt",
    "reference/sahajiv-handoff-v4/fonts/BricolageGrotesque-OFL.txt",
    "package.json",
    "components.json",
  ]) {
    await fs.mkdir(path.dirname(path.join(registry, file)), {
      recursive: true,
    });
    await fs.cp(path.join(root, file), path.join(registry, file), {
      recursive: true,
    });
  }
  await fs.symlink(
    path.join(root, "node_modules"),
    path.join(registry, "node_modules"),
    "dir",
  );
  await write(path.join(registry, "tsconfig.json"), {
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      target: "ES2020",
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      esModuleInterop: true,
      baseUrl: ".",
      paths: { "@/*": ["./*"] },
    },
    include: ["registry/**/*.ts", "registry/**/*.tsx"],
  });
  await run(
    "registry-build",
    process.execPath,
    ["scripts/build-registry.mjs"],
    registry,
    { SAHAJIV_REGISTRY_URL: baseURL },
  );
  const items = (await json(path.join(registry, "registry.json"))).items;
  const ids = items
    .filter((item) => item.type === "registry:ui")
    .map((item) => item.name)
    .sort();
  receipt.entries = ids;
  receipt.entryCount = ids.length;
  const packageFile = {
    name: "sahajiv-fresh-consumer-audit",
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: { build: "tsc --noEmit && vite build --base=./" },
    dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
    devDependencies: {
      "@tailwindcss/vite": "^4.1.11",
      "@types/node": "^22.0.0",
      "@types/react": "^19.2.0",
      "@types/react-dom": "^19.2.0",
      "@vitejs/plugin-react": "^5.0.0",
      tailwindcss: "^4.1.11",
      typescript: "^5.9.2",
      vite: "^7.1.0",
    },
  };
  await write(path.join(consumer, "package.json"), packageFile);
  await write(path.join(consumer, "components.json"), {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "new-york",
    rsc: false,
    tsx: true,
    tailwind: {
      config: "",
      css: "src/index.css",
      baseColor: "neutral",
      cssVariables: true,
      prefix: "",
    },
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      lib: "@/lib",
      hooks: "@/hooks",
    },
    iconLibrary: "lucide",
  });
  await write(path.join(consumer, "tsconfig.json"), {
    compilerOptions: {
      target: "ES2020",
      lib: ["dom", "dom.iterable", "esnext"],
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      module: "esnext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      esModuleInterop: true,
      resolveJsonModule: true,
      baseUrl: ".",
      paths: { "@/*": ["./src/*"] },
    },
    include: ["src", "vite.config.ts"],
  });
  await write(
    path.join(consumer, "vite.config.ts"),
    'import {defineConfig} from "vite"; import react from "@vitejs/plugin-react"; import tailwind from "@tailwindcss/vite"; import path from "node:path"; export default defineConfig({plugins:[react(),tailwind()],resolve:{alias:{"@":path.resolve("src")}}});\n',
  );
  await write(
    path.join(consumer, "index.html"),
    '<html data-mode="light"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  );
  await write(path.join(consumer, "src/index.css"), '@import "tailwindcss";\n');
  await write(
    path.join(consumer, "src/main.tsx"),
    'import React from "react"; import {createRoot} from "react-dom/client"; import "./index.css"; createRoot(document.getElementById("root")!).render(<div>Preparing</div>);\n',
  );
  await run(
    "consumer-npm-install",
    "npm",
    ["install", "--no-audit", "--no-fund"],
    consumer,
  );
  await run(
    "shadcn-install-all",
    process.execPath,
    [
      path.join(root, "node_modules/shadcn/dist/index.js"),
      "add",
      "--yes",
      "--overwrite",
      ...ids.map((id) => `${baseURL}/r/${id}.json`),
    ],
    consumer,
  );
  await write(
    path.join(consumer, "src/main.tsx"),
    `import React from "react"; import {createRoot} from "react-dom/client"; import "./index.css";\n${ids.map((id, index) => `import * as Item${index} from "@/components/ui/${id}";`).join("\n")}\nconst entries=[${ids.map((id, index) => `{name:${JSON.stringify(id)},exports:Object.keys(Item${index})}`).join(",")}];\ncreateRoot(document.getElementById("root")!).render(<><div data-slot="table-container" style={{width:100,height:100,overflow:"scroll"}}><div style={{width:200,height:200}}>CSS cascade probe</div></div><ul>{entries.map(item=><li key={item.name}>{item.name}: {item.exports.join(", ")}</li>)}</ul></>);\n`,
  );
  await run("consumer-build", "npm", ["run", "build"], consumer);
  const generated = new Map(
    await Promise.all(
      items.map(async (item) => [
        item.name,
        await json(path.join(registry, "public/r", `${item.name}.json`)),
      ]),
    ),
  );
  const errors = [];
  const closure = (id, seen = new Set()) => {
    if (seen.has(id)) return seen;
    seen.add(id);
    const item = generated.get(id);
    if (!item) {
      errors.push(`Missing registry dependency: ${id}`);
      return seen;
    }
    for (const dependency of item.registryDependencies ?? [])
      closure(path.basename(dependency, ".json"), seen);
    return seen;
  };
  const installedPackage = await json(path.join(consumer, "package.json"));
  for (const id of ids) {
    const dependencies = [...closure(id)]
      .map((name) => generated.get(name))
      .filter(Boolean);
    const packages = new Set([
      "react",
      "react-dom",
      ...dependencies.flatMap((item) => item.dependencies ?? []),
    ]);
    const files = new Set(
      dependencies
        .flatMap((item) => item.files ?? [])
        .map(
          (file) => file.target ?? `components/ui/${path.basename(file.path)}`,
        ),
    );
    for (const item of dependencies)
      for (const file of item.files ?? []) {
        if (!/\.[cm]?[jt]sx?$/.test(file.path)) continue;
        for (const match of file.content.matchAll(
          /(?:from\s+|import\s+)["']([^"']+)["']/g,
        )) {
          const imported = match[1];
          if (imported.startsWith("@/")) {
            const target = imported.slice(2);
            if (
              ![target, `${target}.ts`, `${target}.tsx`].some((value) =>
                files.has(value),
              )
            )
              errors.push(`${id}: unresolved ${imported} in ${file.path}`);
          } else if (!imported.startsWith(".")) {
            const name = imported.startsWith("@")
              ? imported.split("/").slice(0, 2).join("/")
              : imported.split("/")[0];
            if (!packages.has(name) || !installedPackage.dependencies[name])
              errors.push(`${id}: undeclared package ${name}`);
          } else errors.push(`${id}: unnormalized relative import ${imported}`);
        }
      }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  receipt.checks.dependencyClosure = "PASS";
  receipt.styles = [];
  for (const item of generated.values())
    for (const file of item.files ?? []) {
      if (!file.path.startsWith("registry/sahajiv/styles/")) continue;
      const name = path.basename(file.path, ".css");
      const source = await fs.readFile(path.join(registry, file.path), "utf8");
      const layer = ["fonts", "tokens", "theme", "base"].includes(name)
        ? null
        : name === "morph"
          ? "sahajiv-morph"
          : name === "flow-press"
            ? "sahajiv-flow"
            : "sahajiv-states";
      const expected = layer ? `@layer ${layer} {\n${source}\n}\n` : source;
      const installed = await fs.readFile(
        path.join(consumer, "src", file.target),
        "utf8",
      );
      if (file.content !== expected || installed !== expected)
        throw new Error(`CSS bytes differ: ${name}`);
      receipt.styles.push({
        name,
        layer,
        sourceSHA256: hash(source),
        installedSHA256: hash(installed),
      });
    }
  const fontCSS = await fs.readFile(
    path.join(consumer, "src/styles/sahajiv-fonts.css"),
    "utf8",
  );
  receipt.layerOrder = fontCSS.match(/@layer[^;]+;/)?.[0];
  if (
    receipt.layerOrder !==
    "@layer theme, base, components, utilities, sahajiv-states, sahajiv-flow, sahajiv-morph, sahajiv-accessibility;"
  )
    throw new Error("Unexpected layer order");
  receipt.checks.verbatimStylesAndLayers = "PASS";
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto(`${baseURL}/consumer/`);
  await page.locator("li").last().waitFor();
  await page.mouse.move(500, 500);
  receipt.renderedEntries = await page.locator("li").count();
  receipt.tableInstalledBackgroundClip = await page
    .locator('[data-slot="table-container"]')
    .evaluate(
      (element) =>
        getComputedStyle(element, "::-webkit-scrollbar-thumb").backgroundClip,
    );
  const sourcePage = await browser.newPage();
  await sourcePage.setContent(
    `<style>${await fs.readFile(path.join(registry, "registry/sahajiv/styles/tokens.css"), "utf8")}\n${await fs.readFile(path.join(registry, "registry/sahajiv/styles/table.css"), "utf8")}</style><div data-slot="table-container" style="width:100px;height:100px;overflow:scroll"><div style="width:200px;height:200px">Probe</div></div>`,
  );
  receipt.tableSourceBackgroundClip = await sourcePage
    .locator('[data-slot="table-container"]')
    .evaluate(
      (element) =>
        getComputedStyle(element, "::-webkit-scrollbar-thumb").backgroundClip,
    );
  if (
    receipt.renderedEntries !== ids.length ||
    runtimeErrors.length ||
    receipt.tableInstalledBackgroundClip !== "border-box" ||
    receipt.tableSourceBackgroundClip !== receipt.tableInstalledBackgroundClip
  )
    throw new Error(
      `Browser evidence failed: ${JSON.stringify({ runtimeErrors, receipt })}`,
    );
  receipt.checks.consumerRuntimeAndTableCascade = "PASS";
  receipt.status = "PASS";
  console.log(
    `PASS: ${ids.length} entries installed, imported, built and loaded; ${receipt.styles.length} exact CSS files; table background-clip ${receipt.tableInstalledBackgroundClip}.`,
  );
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await write(path.join(output, "receipt.json"), receipt);
}
