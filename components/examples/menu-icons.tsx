"use client";

import * as React from "react";
import type { ExampleProps } from "./types";
import { AnimatedIcon, type IconMotion } from "@/registry/sahajiv/ui/animated-icon";
import { Icon, IconButton, iconNames, type IconButtonProps } from "@/registry/sahajiv/ui/icon";
import { ItemAdornment, type ItemAdornmentValue } from "@/registry/sahajiv/ui/item-adornment";
import { Button } from "@/registry/sahajiv/ui/button";
import { Input } from "@/registry/sahajiv/ui/input";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/registry/sahajiv/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/registry/sahajiv/ui/dropdown-menu";

const effects: IconMotion[] = ["auto", "tremor", "draw", "spin", "bounce", "validation", "pulse", "none"];

/** Search the actual exported pack; each button produces a local selection. */
export function IconPackExample({ variant = "default", size = "default" }: ExampleProps) {
  const [query, setQuery] = React.useState("");
  const [effect, setEffect] = React.useState<IconMotion>("auto");
  const [selected, setSelected] = React.useState("github");
  const curated = ["github", "save", "circle-help", "menu", "mail", "link", "code", "compass", "folder-plus", "undo-2", "redo-2", "globe", "log-in", "filter", "palette", "rocket"];
  const names = query ? iconNames.filter(name => name.includes(query.trim().toLowerCase())) : curated;
  const buttonVariant = (["default","dashed","ink","pink","beige","cream"].includes(variant) ? variant : "default") as IconButtonProps["variant"];
  const buttonSize = (["default","sm","lg","xl"].includes(size) ? size : "default") as IconButtonProps["size"];
  const iconSize = size === "xl" ? "lg" : size === "sm" || size === "lg" ? size : "default";
  return <div style={{ display:"grid", gap:20, width:"100%", minWidth:0 }}>
    <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
      <IconButton variant={buttonVariant} size={buttonSize} aria-label={`Preview ${selected}; choose next icon`} onClick={() => setSelected(curated[(curated.indexOf(selected) + 1) % curated.length])}><AnimatedIcon name={selected} preset={effect} size={iconSize} /></IconButton>
      <IconButton variant={buttonVariant} size={buttonSize} disabled aria-label="Unavailable icon action"><Icon name="lock" size={iconSize} /></IconButton>
      <Meta>{variant} · {size}. Activate the first icon to choose the next shape.</Meta>
    </div>
    <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
      <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${iconNames.length} icons…`} aria-label="Search icon pack" style={{ flex:"1 1 180px", minWidth:0 }} />
      <Select value={effect} onValueChange={value => setEffect(value as IconMotion)}><SelectTrigger aria-label="Icon effect"><SelectValue /></SelectTrigger><SelectContent>{effects.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(116px,1fr))", gap:8, maxHeight:400, overflowY:"auto", padding:4 }}>
      {names.map(name => <Button key={name} variant={name === selected ? "secondary" : "ghost"} aria-pressed={name === selected} onClick={() => setSelected(name)} style={{ height:"auto", minHeight:76, padding:12, flexDirection:"column", gap:10 }}><AnimatedIcon name={name} preset={effect} size={iconSize} /><span style={{ fontSize:11, overflowWrap:"anywhere" }}>{name}</span></Button>)}
      {!names.length && <Meta role="status">No matching icons. Try “arrow” or “file”.</Meta>}
    </div>
    <Meta role="status">Selected: {selected}. Hover or focus an icon to preview {effect === "none" ? "its static shape" : `the ${effect} effect`}.</Meta>
  </div>;
}

export function ItemAdornmentExample({ variant = "auto", size = "default" }: ExampleProps) {
  const [selected, setSelected] = React.useState("Choose an action");
  const value: ItemAdornmentValue = variant === "none" ? false : variant === "custom" ? <Icon name="github" /> : variant === "explicit" ? { shape:"clover-soft", color:"blue", icon:"save", effect:"pulse" } : "auto";
  const adornmentSize = size === "sm" || size === "lg" ? size : "default";
  return <div style={{ display:"grid", gap:24, justifyItems:"start", width:"100%" }}>
    <div style={{ display:"flex", flexWrap:"wrap", gap:20 }}>
      {["Create project", "Save document", "Share link", "Open settings", "Visit GitHub"].map(identity => <span key={identity} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, width:90, textAlign:"center" }}><ItemAdornment identity={identity} value={value} size={adornmentSize} /><Meta>{identity}</Meta></span>)}
    </div>
    <DropdownMenu><DropdownMenuTrigger asChild chevron><Button variant="outline">Try the menu</Button></DropdownMenuTrigger><DropdownMenuContent>
      <DropdownMenuItem onSelect={() => setSelected("Automatic identity selected")}>Automatic identity</DropdownMenuItem>
      <DropdownMenuItem adornment={{ shape:"clover-soft", color:"olive", icon:"leaf", effect:"pulse" }} onSelect={() => setSelected("Explicit leaf selected")}>Explicit leaf</DropdownMenuItem>
      <DropdownMenuItem adornment={<Icon name="github" />} onSelect={() => setSelected("Custom GitHub selected")}>Custom GitHub</DropdownMenuItem>
      <DropdownMenuItem adornment={false} onSelect={() => setSelected("Text only selected")}>Text only</DropdownMenuItem>
      <DropdownMenuItem disabled>Unavailable action</DropdownMenuItem>
    </DropdownMenuContent></DropdownMenu>
    <Meta role="status">{selected}. This example changes only its local selection.</Meta>
  </div>;
}
