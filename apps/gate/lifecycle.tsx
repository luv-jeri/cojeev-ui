import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from '@/registry/cojeev/ui/button';
import { Card, CardWatermark } from '@/registry/cojeev/ui/card';
import { morphClock } from '@/registry/cojeev/motion/use-morph';
import './styles.css';

const root=createRoot(document.getElementById('root')!);
let attached=0,cleaned=0;
const externalRef=()=>{attached++;return ()=>{cleaned++}};
function render(label='Press me',variant:'default'|'accent'|'outline'='default'){
 flushSync(()=>root.render(<StrictMode><Button ref={externalRef} autoFocus variant={variant}>{label}</Button><Card style={{width:300,height:200}}><CardWatermark className="-heart"/><CardWatermark className="-cross -bl"/></Card><div id="foreign" data-morph="fill" style={{transition:'opacity 2s linear'}}>Foreign</div></StrictMode>));
}
morphClock(100000);render();
Object.assign(window,{__lifecycle:{render,clock:morphClock,counts:()=>({attached,cleaned}),unmount:()=>flushSync(()=>root.unmount())}});
