import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// Render the same React tree used by the client, including both theme states.
// The tiny selector executes while HTML is parsed, before the first paint.
const server=await createServer({root,server:{middlewareMode:true},appType:'custom',ssr:{noExternal:[/^@radix-ui\//,/^motion/,/^framer-motion/,'react-remove-scroll','react-remove-scroll-bar','react-style-singleton','use-callback-ref','use-sidecar']}});
try {
 const {renderPage}=await server.ssrLoadModule('/src/prerender.tsx');
 const light=renderPage('light'),dark=renderPage('dark');
 const file=new URL('../dist/index.html',import.meta.url);
 let source=await readFile(file,'utf8');
 // The page is already present in HTML; fonts and CSS take network priority
 // over its enhancement code on a constrained connection.
 source=source.replaceAll('<script type="module" crossorigin','<script type="module" fetchpriority="low" crossorigin')
  .replaceAll('<link rel="modulepreload" crossorigin','<link rel="modulepreload" fetchpriority="low" crossorigin');
 if(!source.includes('<div id="root"></div>'))throw new Error('Prerender root missing; refusing to ship an empty shell.');
 const markup=`<div id="root">${light}</div><template id="initial-dark">${dark}</template><script>var initialDark=document.getElementById('initial-dark');if(document.documentElement.dataset.mode==='dark')document.getElementById('root').replaceChildren(initialDark.content);initialDark.remove();</script>`;
 await writeFile(file,source.replace('<div id="root"></div>',markup));
 console.log('Prerendered the existing Bond tree for light and dark.');
} finally {await server.close();}
