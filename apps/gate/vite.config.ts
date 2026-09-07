import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

function restoreCatalogSizing(source:string,id:string){
  if(id!=="input-otp")return source;
  // The isolation generator drops the catalog's inline-size containment and
  // definite grid track. Native inputs then size the test canvas intrinsically.
  // Restore that container geometry on BOTH sides; do not style either control.
  // Catalog evidence: index.html:114,160,172. The untouched isolation is retained.
  return source
    .replace("</style>","body{grid-template-columns:minmax(0,1fr)}[data-gate-catalog-frame]{container:stage/inline-size;width:100%;min-width:0;max-width:1080px}[data-gate-catalog-frame]>*{max-width:100%}</style>")
    .replace("</head>",'<meta name="sahajiv-oracle-adapter" content="otp-catalog-sizing"></head>')
    .replace(/<body([^>]*)>/,'<body$1><div data-gate-catalog-frame>')
    .replace(/<script\b/,"</div><script");
}

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: "sahajiv-fidelity-fixtures",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname.startsWith("/reference/sahajiv-handoff-v4/")) {
          const root=path.resolve("reference/sahajiv-handoff-v4");
          const file=path.resolve(".",`.${decodeURIComponent(url.pathname)}`);
          if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end("Not found");return;}
          const types:Record<string,string>={".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json",".svg":"image/svg+xml",".ttf":"font/ttf",".woff2":"font/woff2"};
          res.setHeader("Content-Type",types[path.extname(file)]??"application/octet-stream");
          let content=fs.readFileSync(file);
          if(file.includes(`${path.sep}isolation${path.sep}`)&&file.endsWith('.html')){
            const html=restoreCatalogSizing(content.toString('utf8'),path.basename(path.dirname(file)));
            content=Buffer.from(html);
            if(/\bv-pulse\b/.test(html)&&!html.includes('js/alive.js')){
              // The full handoff catalog loads this original runtime, but its
              // isolation generator omitted it and consequently draws no loader.
              // Complete that bootstrap without editing any reference file.
              const completed=html.replace('<script src="../../js/flow.js">','<script src="../../js/alive.js"></script><script src="../../js/flow.js">');
              if(completed===html)throw new Error(`Missing loader bootstrap insertion point: ${file}`);
              content=Buffer.from(completed.replace('</head>','<meta name="sahajiv-oracle-adapter" content="original-alive-runtime"></head>'));
            }
          }
          res.end(content);return;
        }
        if (url.pathname !== "/candidate") return next();
        const id = url.searchParams.get("id") ?? "button";
        const file = url.searchParams.get("file") ?? "default-default-rest.html";
        if (!/^[a-z-]+$/.test(id) || !/^[a-z0-9.-]+\.html$/.test(file)) { res.statusCode=400;res.end("Invalid fixture");return; }
        const source = restoreCatalogSizing(fs.readFileSync(path.resolve("reference/sahajiv-handoff-v4/isolation", id, file), "utf8"),id);
        const canvas = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
        const mode = file.includes("-dark") ? "dark" : "light";
        // Only authored fixture markup and canvas geometry cross this boundary.
        // Candidate styles, behavior, and component DOM come from production TSX.
        const fixture = source.match(/<body[^>]*>([\s\S]*?)<script/)?.[1] ?? "";
        const html = `<!doctype html><html lang="en" data-mode="${mode}" data-seed="42"><head><meta charset="utf-8"><title>Candidate ${id}</title><style>${canvas}</style></head><body><script type="application/json" id="fixture">${JSON.stringify({id,fixture}).replace(/</g,"\\u003c")}</script><script type="module" src="/apps/gate/candidate.tsx"></script></body></html>`;
        res.setHeader("Content-Type", "text/html");
        res.end(await server.transformIndexHtml(req.url ?? "/candidate", html));
      });
    },
  }],
  resolve: { alias: { "@": path.resolve(".") } },
  optimizeDeps: { entries: ["apps/gate/candidate.tsx"] },
  css: { postcss: { plugins: [] } },
  // Verification runs must not reload when an independent docs build writes Next metadata.
  server: { host:"127.0.0.1", port: 4317, strictPort: true, hmr:false, watch:null },
});
