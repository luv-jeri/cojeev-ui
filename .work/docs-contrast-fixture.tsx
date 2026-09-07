import * as React from "react";
import {createRoot} from "react-dom/client";
import {AlertExample} from "../components/examples/static";
import {ButtonGroupExample} from "../components/examples/composed";
import {setMotionMode} from "../registry/sahajiv/motion/settings";
import "../app/globals.css";
function Fixture(){React.useEffect(()=>{Object.assign(window,{setFixtureMotion:setMotionMode});document.documentElement.dataset.ready="1"},[]);return <main style={{padding:16,maxWidth:720,margin:"auto",display:"grid",gap:16}}><section data-testid="button-group"><ButtonGroupExample/></section>{['default','info','ok','warn','danger','pink'].map(variant=><section key={variant} data-alert-case={variant}><AlertExample variant={variant}/></section>)}</main>}
const root=document.createElement("div");document.body.append(root);createRoot(root).render(<Fixture/>);
