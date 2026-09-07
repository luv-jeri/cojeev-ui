import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const getArg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const baseURL = (getArg("url") || "https://luv-jeri.github.io/sahajiv-ui").replace(/\/$/, "");
const ids = (getArg("components") || "button,badge,card,accordion,dialog").split(",");
const foundationOnly = ids.length === 1 && ids[0] === "sahajiv";
const supported = new Set(["sahajiv", "button", "badge", "card", "accordion", "dialog"]);
if (ids.some(id => !supported.has(id))) throw new Error("The installation specimen supports Button, Badge, Card, Accordion and Dialog.");
if (!foundationOnly && !["button", "badge", "card"].every(id => ids.includes(id))) throw new Error("The specimen requires Button, Badge and Card.");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sahajiv-ui-stranger-"));
const write = (file, contents) => { const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, contents); };
function run(command, args) { execFileSync(command, args, { cwd: directory, stdio: "inherit", env: { ...process.env, CI: "true" } }); }
write("package.json", JSON.stringify({
  name: "sahajiv-stranger", private: true, version: "0.0.0", type: "module",
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
write("index.html", '<!doctype html><html lang="en" data-mode="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SahaJiv stranger install</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
write("src/index.css", '@import "tailwindcss";\n');
write("src/main.tsx", 'import React from "react";import {createRoot} from "react-dom/client";import App from "./App";import "./index.css";createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);\n');
write("src/App.tsx", 'export default function App(){return <main>Installing SahaJiv UI</main>}\n');
console.log(`Fresh consumer: ${directory}`);
run("npm", ["install"]);
run("npx", ["--yes", "shadcn@latest", "init", "--template", "vite", "--base", "radix", "--preset", "nova", "--no-monorepo", "--yes"]);
run("npx", ["--yes", "shadcn@latest", "add", ...ids.map(id => `${baseURL}/r/${id}.json`), "--yes", "--overwrite"]);
const accordion = ids.includes("accordion"), dialog = ids.includes("dialog");
write("src/App.tsx", foundationOnly ? `export default function App(){return <main style={{padding:24}}><h1 style={{fontFamily:"var(--font-display)",fontSize:36}}>SahaJiv foundation</h1><p data-foundation-text>Typography and canvas from the base registry item.</p></main>}\n` : `import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card,CardTitle,CardDescription} from "@/components/ui/card";
${accordion ? 'import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from "@/components/ui/accordion";' : ""}
${dialog ? 'import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from "@/components/ui/dialog";' : ""}
export default function App(){return <main style={{padding:24,maxWidth:900,margin:"auto"}}>
<h1 style={{fontFamily:"var(--font-display)",fontSize:36,marginBottom:12}}>SahaJiv stranger install</h1>
<p style={{marginBottom:24}}>Installed through the public shadcn CLI into an empty project.</p>
<label>Theme <select aria-label="Theme" defaultValue="light" onChange={e=>{document.documentElement.dataset.mode=e.target.value}}><option value="light">Light</option><option value="dark">Dark</option></select></label>
<Card variant="cream" style={{marginTop:24}}><CardTitle>${ids.length} installed components</CardTitle><CardDescription>Shared typography, surfaces and movement.</CardDescription><div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:24}}><Button variant="accent">Add schedule</Button><Button variant="secondary">View details</Button><Badge variant="olive">Ready</Badge></div></Card>
${accordion ? '<Accordion type="single" collapsible style={{marginTop:24}}><AccordionItem value="installation"><AccordionTrigger>What was installed?</AccordionTrigger><AccordionContent>Real registry components with keyboard and pointer behavior.</AccordionContent></AccordionItem></Accordion>' : ""}
${dialog ? '<Dialog><DialogTrigger asChild><Button style={{marginTop:24}}>Open details</Button></DialogTrigger><DialogContent><DialogTitle>Installation details</DialogTitle><DialogDescription>This dialog came from the SahaJiv registry.</DialogDescription></DialogContent></Dialog>' : ""}
</main>}
`);
run("npm", ["run", "build"]);
fs.mkdirSync("artifacts/stranger", { recursive: true });
const receipt = { directory, baseURL, components: ids, foundationOnly, builtAt: new Date().toISOString(), build: "PASS", freshDirectory: true, replacedGeneratedScaffold: true, screenshotVerification: "pending" };
fs.writeFileSync(`artifacts/stranger/${foundationOnly ? "foundation" : "install"}.json`, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
