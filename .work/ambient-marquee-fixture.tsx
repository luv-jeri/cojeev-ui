import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {AmbientBackgroundExample,MarqueeExample} from '../components/examples/backgrounds';
import {AmbientBackground} from '../registry/sahajiv/ui/ambient-background';
import {Marquee} from '../registry/sahajiv/ui/marquee';
import {Button} from '../registry/sahajiv/ui/button';
import {setMotionMode} from '../registry/sahajiv/motion/settings';
import '../app/globals.css';
import '../registry/sahajiv/styles/ambient-background.css';
import '../registry/sahajiv/styles/marquee.css';
const host=document.createElement('main');document.body.append(host);
document.body.style.cssText='margin:0;background:var(--v-canvas);color:var(--v-text)';host.style.cssText='max-width:1100px;margin:auto;padding:24px;display:grid;gap:32px';
function Fixture(){const [show,setShow]=React.useState(true);React.useEffect(()=>{Object.assign(window,{setMotionMode,setFixtureVisible:setShow});document.documentElement.dataset.ready='true'},[]);return <><button id="outside" type="button">Outside the examples</button>{show&&<><section data-testid="ambient-example"><AmbientBackgroundExample/></section><section data-testid="marquee-example"><MarqueeExample/></section><Marquee data-testid="interactive" label="Reading links"><Button id="unique-link">Read the first story</Button><a id="second-link" href="#outside">Read the second story</a><p style={{width:650}}>A long description that should remain readable on a compact screen when motion is off. {'Responsive content. '.repeat(8)}</p></Marquee><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16}}>{(['drift','orbit','contour'] as const).map(variant=><AmbientBackground key={variant} data-testid={'sample-'+variant} variant={variant} style={{minHeight:220}}/>)}</div></>}<div style={{height:1200}} aria-hidden="true"/><p>End of the verification page</p></>}
createRoot(host).render(<Fixture/>);
