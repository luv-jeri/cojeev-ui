import React from "react";
import { createRoot } from "react-dom/client";
import { Button, ButtonIndicator } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card, CardTitle } from "@/registry/sahajiv/ui/card";
import { morphClock, rewindMorph } from "@/registry/sahajiv/motion/use-morph";
import "./styles.css";

declare global { interface Window { __sahajivGate?: { rewind:()=>void; clock:(t:number|null)=>void } } }
window.__sahajivGate={rewind:rewindMorph,clock:morphClock};

const payload = JSON.parse(document.getElementById("fixture")!.textContent!);
const fixture = new DOMParser().parseFromString(payload.fixture, "text/html");
const components: Record<string, React.ElementType> = { "v-btn": Button, "v-badge": Badge, "v-card": Card, "v-card__title": CardTitle, "v-pulse":ButtonIndicator };
const attributes: Record<string,string> = { class:"className", for:"htmlFor", tabindex:"tabIndex", viewbox:"viewBox", "stroke-width":"strokeWidth", "stroke-linecap":"strokeLinecap", "stroke-linejoin":"strokeLinejoin", "fill-rule":"fillRule", "clip-rule":"clipRule" };
let renderedRoots = 0;
function convert(node: Node, index: number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof Element) || node.tagName === "SCRIPT") return null;
  const props: Record<string,unknown> = { key:index };
  for (const attribute of Array.from(node.attributes)) {
    if (/^on/i.test(attribute.name)) continue;
    if (attribute.name === "style") {
      const style:Record<string,string>={};
      for (let i=0;i<(node as HTMLElement).style.length;i++) {
        const key=(node as HTMLElement).style[i];
        style[key.startsWith("--") ? key : key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=(node as HTMLElement).style.getPropertyValue(key);
      }
      props.style=style;
    } else if (["disabled","hidden","checked","multiple"].includes(attribute.name)) props[attribute.name]=true;
    else props[attributes[attribute.name]??attribute.name]=attribute.value;
  }
  const className = Array.from(node.classList).find(name=>components[name]);
  let Component:string|React.ElementType=node.tagName.toLowerCase();
  if (className) {
    Component=components[className];
    const gate = node.getAttribute("data-gate")?.split("/");
    if (gate && gate[0]===payload.id && className!=="v-card__title") {
      renderedRoots++;
      props.variant=gate[1];props.size=gate[2];
      props.className=Array.from(node.classList).filter(c=>c!==className&&!c.startsWith("-")).join(" ");
    }
  }
  const nodes=Array.from(node.childNodes);
  const indicator=className==="v-btn" ? nodes.find(n=>n instanceof Element&&n.classList.contains("v-pulse")) : undefined;
  if(indicator)props.loadingIndicator=convert(indicator,0);
  const children=nodes.filter(n=>n!==indicator).map(convert);
  return React.createElement(Component, props, children.length ? children : undefined);
}
const children=Array.from(fixture.body.childNodes).map(convert);
if (!renderedRoots) throw new Error(`No production component mapped for ${payload.id}`);
document.body.replaceChildren();
createRoot(document.body).render(<>{children}</>);
requestAnimationFrame(()=>{ document.documentElement.dataset.ready="1"; });
