"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { useReferenceRef } from "../lib/reference-ref";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { decodeHeading,headingTiming } from "../lib/reference-additions-math";
export type ArticleHeadingItem={id:string;title:string;meta?:string;href?:string};
export type ArticleHeadingsProps=Omit<React.ComponentProps<"div">,"children">&{
 items:readonly ArticleHeadingItem[];label?:string;headingLevel?:2|3|4;duration?:number;stagger?:number;
 scrambleLength?:number;preserveChance?:number;tailChance?:number;paused?:boolean;replayKey?:string|number;
 size?:"sm"|"default"|"lg";onDecodeComplete?:()=>void;
};
/** Semantic article headings stay intact while a decorative noise frontier resolves over them. */
export function ArticleHeadings({items,label="Field notes",headingLevel=2,duration=700,stagger=140,scrambleLength=10,preserveChance=.25,tailChance=.12,paused=false,replayKey=0,size="default",onDecodeComplete,className,ref,...props}:ArticleHeadingsProps){
 const host=React.useRef<HTMLDivElement>(null),consumed=React.useRef(""),callback=React.useRef(onDecodeComplete);
 const attach=useReferenceRef(host,ref);
 const {enabled,inView}=useMotionVisibility(host),running=enabled&&inView&&!paused;
 const Heading=headingLevel===3?"h3":headingLevel===4?"h4":"h2";
 const segmenter=React.useMemo(()=>new Intl.Segmenter(undefined,{granularity:"grapheme"}),[]);
 const timing=headingTiming(duration,stagger,items.length),content=JSON.stringify(items.map(item=>item.title));
 const token=JSON.stringify([content,replayKey,timing.duration,timing.delay,scrambleLength,preserveChance,tailChance]);
 React.useEffect(()=>{callback.current=onDecodeComplete;},[onDecodeComplete]);
 React.useEffect(()=>{
  const root=host.current;if(!root)return;
  const rows=Array.from(root.querySelectorAll<HTMLElement>("[data-heading-visual]"));
  const originals=rows.map(row=>Array.from(row.querySelectorAll<HTMLElement>("[data-decode-value]"),node=>({node,text:node.textContent??""})));
  const restore=()=>{originals.forEach(row=>row.forEach(({node,text})=>{node.textContent=text;}));root.dataset.running="false";};
  if(!running){restore();root.dataset.state="still";return;}
  if(consumed.current===token){root.dataset.state="complete";return;}
  consumed.current=token;
  const titles=JSON.parse(content) as string[];
  let frame=0,start=0,lastPaint=-100;
  const draw=(now:number)=>{
   if(!start)start=now;
   const elapsed=now-start,done=elapsed>=timing.duration+timing.delay*Math.max(0,rows.length-1);
   if(elapsed-lastPaint>=40||done){
    lastPaint=elapsed;
    originals.forEach((glyphs,index)=>{
     const p=Math.max(0,Math.min(1,(elapsed-index*timing.delay)/timing.duration));
     if(elapsed<index*timing.delay||glyphs.length>1000||index>=80)return;
     const output=decodeHeading(titles[index],p,Math.floor(elapsed/40)+index,{scrambleLength,preserveChance,tailChance});
     glyphs.forEach(({node},i)=>{node.textContent=output[i]??"";});
    });
   }
   root.dataset.state=done?"complete":"decoding";root.dataset.running=String(!done);
   if(done){restore();callback.current?.();}else frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);restore();root.dataset.state="still";};
 },[running,token,content,timing.duration,timing.delay,scrambleLength,preserveChance,tailChance]);
 const title=(text:string)=><><span className="v-article-headings__accessible">{text}</span><span aria-hidden="true" data-heading-visual="">{text.split(/(\s+)/).map((word,i)=>/^\s+$/.test(word)?Array.from(segmenter.segment(word),({segment},j)=><span className="v-article-headings__glyph" key={`${i}:${j}`}><span className="v-article-headings__measure">{segment}</span><span data-decode-value="">{segment}</span></span>):<span className="v-article-headings__word" key={i}>{Array.from(segmenter.segment(word),({segment},j)=><span className="v-article-headings__glyph" key={j}><span className="v-article-headings__measure">{segment}</span><span data-decode-value="">{segment}</span></span>)}</span>)}</span></>;
 return <div {...props} ref={attach} data-slot="article-headings" data-size={size} data-running="false" data-state="still" className={cn("v-article-headings",className)}>
 <div className="v-article-headings__header"><span>{label}</span><span>{items.length} {items.length===1?"entry":"entries"}</span></div>
 {items.map((item,index)=><article key={item.id} className="v-article-headings__entry"><span aria-hidden="true" className="v-article-headings__index">{String(index+1).padStart(2,"0")}</span><Heading>{item.href?<a href={item.href}>{title(item.title)}</a>:title(item.title)}</Heading>{item.meta&&<p className="v-article-headings__meta">{item.meta}</p>}</article>)}
 </div>;
}
