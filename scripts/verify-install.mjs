/** Build a fresh public-registry specimen; pass --components=... for optional entries. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const getArg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const baseURL = (getArg("url") || "https://luv-jeri.github.io/cojeev-ui").replace(/\/$/, "");
const ids = [...new Set((getArg("components") || "button,badge,card,accordion,dialog").split(",").map(id => id.trim()).filter(Boolean))];
const foundationOnly = ids.length === 1 && ids[0] === "cojeev";
const specimens = {
  button: { imports: "Button", content: '<Button variant="accent" onClick={() => setCount(value => value + 1)}>Add schedule</Button><p role="status">Schedules added: {count}</p>' },
  badge: { imports: "Badge", content: '<Badge variant="olive">Ready</Badge>' },
  card: { imports: "Card, CardTitle, CardDescription", content: '<Card variant="cream"><CardTitle>Installed and ready</CardTitle><CardDescription>Shared typography, surfaces and movement.</CardDescription></Card>' },
  accordion: { imports: "Accordion, AccordionItem, AccordionTrigger, AccordionContent", content: '<Accordion type="single" collapsible><AccordionItem value="installation"><AccordionTrigger>What was installed?</AccordionTrigger><AccordionContent>Real registry components with keyboard and pointer behavior.</AccordionContent></AccordionItem></Accordion>' },
  dialog: { imports: "Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription", content: '<Dialog><DialogTrigger>Open details</DialogTrigger><DialogContent><DialogTitle>Installation details</DialogTitle><DialogDescription>This dialog came from the Cojeev registry.</DialogDescription></DialogContent></Dialog>' },
  "code-block": { imports: "CodeBlock", content: '<CodeBlock code={"const installed = true;\\n"} title="installed.ts" language="ts" copyLabel="Copy code" />' },
  "text-reveal": { imports: "TextReveal", content: '<TextReveal as="h2" text="Good things take shape." />' },
  "semantic-bloom": { imports: "SemanticBloom", content: '<SemanticBloom text="000h" seed={17} size={1.3} />' },
  "animated-icon": { imports: "AnimatedIcon", content: '<AnimatedIcon name="heart" preset="draw" active size="lg" />' },
  "motion-drawer": { imports: "MotionDrawer", content: '<MotionDrawer title="Installed drawer" description="A fresh-project component." triggerLabel="Open installed drawer"><p>Editable source from the registry.</p></MotionDrawer>' },
  "organism-assembly": { imports: "OrganismAssembly", content: '<OrganismAssembly autoAssemble defaultValue="focus" />' },
  "shape-scene": { imports: "ShapeScene", content: '<ShapeScene animate={false} interactive={false} aria-label="Installed Cojeev sculpture" />' },
  "bento-builder": { imports: "BentoBuilder", content: '<BentoBuilder />' },
  "checkbox": { imports: "Checkbox", content: '<Checkbox aria-label="Keep installation note" shape="flower" />' },
  "slider": { imports: "Slider", content: '<Slider aria-label="Installed rubber slider" appearance="rubber" defaultValue={[35]} />' },
  "switch": { imports: "Switch", content: '<Switch aria-label="Installed rocker switch" appearance="rocker" />' },
};
if (!ids.length || ids.some(id => id !== "cojeev" && !specimens[id])) throw new Error(`Supported specimen entries: cojeev, ${Object.keys(specimens).join(", ")}.`);
const temporaryRoot = path.resolve(getArg("tmp") || os.tmpdir());
if (temporaryRoot === root || temporaryRoot.startsWith(`${root}${path.sep}`)) throw new Error("The consumer must be created outside the repository.");
fs.mkdirSync(temporaryRoot, { recursive: true });
const directory = fs.mkdtempSync(path.join(temporaryRoot, "cojeev-ui-stranger-"));
const receiptFile = path.resolve(getArg("receipt") || path.join(root, "artifacts/stranger", `${foundationOnly ? "foundation" : "install"}-${Date.now()}.json`));
const receipt = { directory, baseURL, components: ids, foundationOnly, node: process.version, startedAt: new Date().toISOString(), build: "PENDING", freshDirectory: true, screenshotVerification: "not-run", checks: {} };
const write = (file, contents) => { const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, contents); };
function run(command, args) { return execFileSync(command, args, { cwd: directory, stdio: "inherit", env: { ...process.env, PATH: `${path.dirname(process.execPath)}:${process.env.PATH}`, CI: "true" } }); }
write("package.json", JSON.stringify({
  name: "cojeev-stranger", private: true, version: "0.0.0", type: "module",
  scripts: { dev: "vite --host 127.0.0.1", build: "tsc --noEmit && vite build" },
  dependencies: { react: "^19.2.0", "react-dom": "^19.2.0" },
  devDependencies: { "@types/react": "^19.2.0", "@types/react-dom": "^19.2.0", "@types/node": "^22.0.0", "@vitejs/plugin-react": "^5.0.0", "@tailwindcss/vite": "^4.1.0", tailwindcss: "^4.1.0", typescript: "^5.9.2", vite: "^7.1.0" },
}, null, 2));
write("tsconfig.json", JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, skipLibCheck: true, noEmit: true, allowImportingTsExtensions: true, resolveJsonModule: true, esModuleInterop: true, paths: { "@/*": ["./src/*"] } }, include: ["src", "vite.config.ts"] }, null, 2));
write("vite.config.ts", `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import {fileURLToPath,URL} from "node:url";
export default defineConfig({plugins:[react(),tailwindcss()],resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}}});
`);
write("index.html", '<!doctype html><html lang="en" data-mode="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cojeev stranger install</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
write("src/index.css", '@import "tailwindcss";\n');
write("src/main.tsx", 'import React from "react";import {createRoot} from "react-dom/client";import App from "./App";import "./index.css";createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);\n');
write("src/App.tsx", 'export default function App(){return <main>Installing Cojeev UI</main>}\n');
console.log(`Fresh consumer: ${directory}`);
try {
  run("npm", ["install"]);
  run("npx", ["--yes", "shadcn@latest", "init", "--template", "vite", "--base", "radix", "--preset", "nova", "--no-monorepo", "--yes"]);
  run("npx", ["--yes", "shadcn@latest", "add", ...ids.map(id => `${baseURL}/r/${id}.json`), "--yes", "--overwrite"]);
  receipt.checks.publicCLIInstall = "PASS";
  write("src/App.tsx", foundationOnly ? `export default function App(){return <main style={{padding:24}}><h1 style={{fontFamily:"var(--font-display)",fontSize:36}}>Cojeev foundation</h1><p data-foundation-text>Typography and canvas from the base registry item.</p></main>}\n` : `import * as React from "react";
${ids.filter(id => specimens[id]).map(id => `import {${specimens[id].imports}} from "@/components/ui/${id}";`).join("\n")}
export default function App(){const [count,setCount]=React.useState(0);return <main style={{padding:24,maxWidth:900,margin:"auto"}}>
<h1 style={{fontFamily:"var(--font-display)",fontSize:36,marginBottom:12}}>Cojeev stranger install</h1>
<p style={{marginBottom:24}}>Installed through the public shadcn CLI into an empty project.</p>
<label>Theme <select aria-label="Theme" defaultValue="light" onChange={event=>{document.documentElement.dataset.mode=event.target.value}}><option value="light">Light</option><option value="dark">Dark</option></select></label>
${ids.filter(id => specimens[id]).map(id => `<section data-specimen="${id}" style={{marginTop:24,minWidth:0}}>${specimens[id].content}</section>`).join("\n")}
</main>}
`);
  const installed = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  if (ids.includes("shape-scene")) {
    receipt.sceneDependencies = {};
    for (const name of ["three", "@types/three"]) {
      if (!(installed.dependencies?.[name] || installed.devDependencies?.[name])) throw new Error(`ShapeScene did not install required package ${name}`);
      receipt.sceneDependencies[name] = JSON.parse(fs.readFileSync(path.join(directory, "node_modules", name, "package.json"), "utf8")).version;
    }
    receipt.checks.optionalSceneDependencies = "PASS";
  } else if (installed.dependencies?.three || installed.devDependencies?.three || installed.dependencies?.["@types/three"] || installed.devDependencies?.["@types/three"]) throw new Error("Optional Three.js packages leaked into a specimen that did not request ShapeScene");
  run("npm", ["run", "build"]);
  receipt.build = "PASS";
  receipt.checks.typecheckAndBuild = "PASS";
  receipt.replacedGeneratedScaffold = true;
} catch (error) {
  receipt.build = "FAIL";
  receipt.error = error.stack;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  receipt.finishedAt = new Date().toISOString();
  receipt.runtimeSeconds = (Date.parse(receipt.finishedAt) - Date.parse(receipt.startedAt)) / 1000;
  fs.mkdirSync(path.dirname(receiptFile), { recursive: true });
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({ ...receipt, receiptFile }, null, 2));
}
