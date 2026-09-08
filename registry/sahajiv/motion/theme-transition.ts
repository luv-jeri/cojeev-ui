"use client";
import { animate, frame, type AnimationPlaybackControls } from "motion";

const colorTokens=["--v-canvas","--v-beige","--v-beige-2","--v-cream-pill","--v-text","--v-text-2","--v-text-3","--v-ink","--v-ink-soft","--v-on-ink","--v-border","--surface-quiet","--surface-work","--surface-automation","--surface-memory","--surface-library","--surface-ai","--surface-alert","--status-ok-bg","--status-ok-ink","--status-warn-bg","--status-warn-ink","--status-danger-bg","--status-danger-ink","--status-info-bg","--status-info-ink"];
const running=new WeakMap<HTMLElement,{controls:AnimationPlaybackControls;clear:()=>void}>();

/** Animate inherited color tokens once, so nested surfaces crossfade together. */
export function applyTheme(mode:"light"|"dark",quiet=false,root:HTMLElement=document.documentElement) {
  if(root.dataset.mode===mode) {if(quiet){const active=running.get(root);active?.controls.complete();active?.clear();}return;}
  const before=getComputedStyle(root);
  const from=Object.fromEntries(colorTokens.map(token=>[token,before.getPropertyValue(token).trim()]));
  const active=running.get(root);active?.controls.stop();active?.clear();
  root.dataset.mode=mode;
  if(quiet)return;
  const after=getComputedStyle(root);
  const frames:Record<string,string[]>={};
  for(const token of colorTokens){const to=after.getPropertyValue(token).trim();if(from[token]!==to&&CSS.supports("color",from[token])&&CSS.supports("color",to))frames[token]=[from[token],to];}
  if(!Object.keys(frames).length)return;
  const saved=new Map(Object.keys(frames).map(token=>[token,root.style.getPropertyValue(token)]));
  const restore=()=>{for(const [token,value] of saved){if(value)root.style.setProperty(token,value);else root.style.removeProperty(token)}};
  const clear=()=>{
    if(running.get(root)!==owner)return;
    restore();running.delete(root);
    // A stopped/completed Motion value can still have one DOM render queued.
    // Restore after that phase too, unless a newer theme now owns the tokens.
    frame.postRender(()=>{if(!running.has(root))restore()});
  };
  const controls=animate(root,frames,{duration:.38,ease:[.2,.65,.25,1]});
  const owner={controls,clear};running.set(root,owner);
  void controls.finished.then(clear,clear);
}
