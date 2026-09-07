import * as React from 'react';
import {createRoot} from 'react-dom/client';
import '../app/globals.css';
const modules=import.meta.glob('../registry/sahajiv/ui/code-block.tsx');
const styles=import.meta.glob('../registry/sahajiv/styles/code-block.css');
const load=modules['../registry/sahajiv/ui/code-block.tsx'];
const code='const greeting = "Hello, SahaJiv";\nconsole.log(greeting);\n'+Array.from({length:30},(_,i)=>`// line ${i}: `+'a'.repeat(140)).join('\n');
const host=document.createElement('main');document.body.append(host);
document.documentElement.dataset.mode='light';document.body.style.cssText='margin:0;padding:20px;background:var(--v-canvas);color:var(--v-text)';
if(!load){host.textContent='CodeBlock is not implemented';document.documentElement.dataset.ready='1';}
else { await styles['../registry/sahajiv/styles/code-block.css']?.();const {CodeBlock,CopyButton}=await load() as any;
createRoot(host).render(<><input id="selection" defaultValue="restore this selection"/><div id="editable" contentEditable suppressContentEditableWarning>Keep this selected text</div><div id="outside" style={{height:20}}/><CodeBlock code={code} title="Example.ts" language="typescript" data-testid="code"/><div id="standalone"><CopyButton code="standalone exact text" /></div><CodeBlock code={code} wrap title="Wrapped example" data-testid="wrapped"/></>);
window.addEventListener('keydown',event=>{if(event.altKey&&event.key==='c'){event.preventDefault();host.querySelector<HTMLButtonElement>('[data-slot="copy-button"]')?.click();}});
requestAnimationFrame(()=>document.documentElement.dataset.ready='1');}
