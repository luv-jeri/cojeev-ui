import * as React from "react";
import { createRoot } from "react-dom/client";
import { Checkbox, type SelectorIndicator, type SelectorSize } from "../../registry/sahajiv/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../registry/sahajiv/ui/radio-group";
import { Questionnaire, QuestionnaireOptions, QuestionnaireOption, QuestionnaireOptionBody } from "../../registry/sahajiv/ui/questionnaire";
import { ItemAdornment, type ItemAdornmentValue } from "../../registry/sahajiv/ui/item-adornment";
import { Button } from "../../registry/sahajiv/ui/button";
import { Icon } from "../../registry/sahajiv/ui/icon";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../registry/sahajiv/ui/select";
import { Combobox } from "../../registry/sahajiv/ui/combobox";
import { MultiSelect } from "../../registry/sahajiv/ui/multi-select";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "../../registry/sahajiv/ui/command";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "../../registry/sahajiv/ui/dropdown-menu";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "../../registry/sahajiv/ui/context-menu";
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from "../../registry/sahajiv/ui/menubar";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink } from "../../registry/sahajiv/ui/navigation-menu";
import { setMotionMode, setFlowSettings } from "../../registry/sahajiv/motion/settings";
import { AppearanceMenu, AppearanceProvider, setAppearance, defaultAppearance, type PaletteName } from "../../registry/sahajiv/ui/appearance";

const host = document.createElement("main");
host.id = "review-list-fixture";
for (const child of Array.from(document.body.children)) if (child instanceof HTMLElement) child.style.display = "none";
document.body.append(host);
const indicators: SelectorIndicator[] = ["auto", "dot", "check", "diamond", "flower"];
const sizes: SelectorSize[] = ["sm", "default", "lg", 1, 100, Number.NaN];
const adornments: ItemAdornmentValue[] = [{ icon: "save" }, { icon: "save", showBackground: false }, { showIcon: false }, { showIcon: false, showBackground: false }, false, <Icon key="custom" name="github" />];
const options = Array.from({ length: 24 }, (_, index) => ({ value: `option-${index + 1}`, label: `Option ${String(index + 1).padStart(2, "0")}${index === 20 ? " · project-notes-with-a-very-long-unbroken-filename-that-should-wrap-and-remain-readable.md" : ""}`, disabled: index === 4, adornment: adornments[index % adornments.length] }));
Object.assign(window, { __reviewMode: (mode: string) => { setMotionMode(mode === "off" ? "off" : "subtle"); setFlowSettings({ variant: mode === "flow-off" ? "off" : "pebble" }); }, __reviewAppearance: (palette: PaletteName) => setAppearance({ ...defaultAppearance, palette }) });
function Fixture() {
  const [check, setCheck] = React.useState(false), [radio, setRadio] = React.useState("one"), [choice, setChoice] = React.useState("one"), [selection, setSelection] = React.useState(""), [multi, setMulti] = React.useState<string[]>([]), [event, setEvent] = React.useState("");
  const menuItems = (kind: "dropdown" | "context" | "menubar") => options.map(option => {
    const Component = kind === "dropdown" ? DropdownMenuItem : kind === "context" ? ContextMenuItem : MenubarItem;
    return <Component key={option.value} disabled={option.disabled} adornment={option.adornment} onSelect={() => setEvent(`${kind}:${option.value}`)}>{option.label}</Component>;
  });
  return <><h1>Selectors and list controls</h1><section id="selector-section"><h2>Size and mark</h2>
    <div className="review-grid"><div><h3>Visual size, stable hit area</h3>{sizes.map((size, index) => <Checkbox key={index} data-size-case={index} size={size} defaultChecked>{String(size)} selector</Checkbox>)}</div>
    <div><h3>Selected indicator</h3>{indicators.map(indicator => <div className="review-mark-row" key={indicator} data-mark-case={indicator}><Checkbox defaultChecked indicator={indicator}>{indicator}</Checkbox><RadioGroup aria-label={`${indicator} radio`} defaultValue="selected" indicator={indicator}><RadioGroupItem value="selected">{indicator} radio</RadioGroupItem></RadioGroup></div>)}</div></div>
    <form id="review-form"><Checkbox data-probe="check" name="feature" value="idea" showIndicator={false} checked={check} onCheckedChange={value => setCheck(value === true)}>Outer shape only</Checkbox>
      <Checkbox disabled defaultChecked size="sm">Managed checkbox</Checkbox>
      <RadioGroup name="rhythm" data-probe="radio" aria-label="Radio form" showIndicator={false} value={radio} onValueChange={setRadio}><RadioGroupItem value="one">Radio one</RadioGroupItem><RadioGroupItem value="two">Radio two</RadioGroupItem><RadioGroupItem value="disabled" disabled>Managed radio</RadioGroupItem></RadioGroup>
      <Questionnaire><QuestionnaireOptions name="start" aria-label="Questionnaire form" selectorSize="lg" showSelectorIndicator={false} value={choice} onValueChange={setChoice}><QuestionnaireOption value="one"><QuestionnaireOptionBody><b>Questionnaire one</b><small>Outer shape selected, with no inner mark.</small></QuestionnaireOptionBody></QuestionnaireOption><QuestionnaireOption value="two" selectorSize="sm" showSelectorIndicator selectorIndicator="diamond"><QuestionnaireOptionBody><b>Questionnaire two</b><small>A small diamond overrides the group settings.</small></QuestionnaireOptionBody></QuestionnaireOption></QuestionnaireOptions></Questionnaire>
    </form></section>
    <section id="adornment-section"><h2>Independent appearance</h2><div className="review-adornments">{adornments.map((value, index) => <div key={index} data-adornment-case={index}><ItemAdornment identity="Project notes" value={value} /><span>{["Both", "Icon only", "Blob only", "Neither", "Opt out", "Custom"][index]}</span></div>)}</div></section>
    <section id="lists-section"><h2>List scrollports</h2><div className="review-grid">
      <div id="select-case"><h3>Select</h3><Select value={selection} onValueChange={value => { setSelection(value); setEvent(`select:${value}`); }}><SelectTrigger aria-label="Review select"><SelectValue placeholder="Choose one" /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled} adornment={option.adornment}>{option.label}</SelectItem>)}</SelectContent></Select></div>
      <div id="combobox-case"><h3>Combobox</h3><Combobox aria-label="Review combobox" options={options} onValueChange={value => setEvent(`combobox:${value}`)} /></div>
      <div id="multi-case"><h3>MultiSelect</h3><MultiSelect label="Review multiple" options={options} value={multi} onValueChange={value => { setMulti(value); setEvent(`multi:${value.join(",")}`); }} /></div>
      <div id="dropdown-case"><h3>Dropdown</h3><DropdownMenu><DropdownMenuTrigger asChild><Button>Review dropdown</Button></DropdownMenuTrigger><DropdownMenuContent>{menuItems("dropdown")}<DropdownMenuSub><DropdownMenuSubTrigger>Nested choices</DropdownMenuSubTrigger><DropdownMenuSubContent>{menuItems("dropdown")}</DropdownMenuSubContent></DropdownMenuSub></DropdownMenuContent></DropdownMenu></div>
      <div id="context-case"><h3>Context menu</h3><ContextMenu><ContextMenuTrigger asChild><Button variant="outline">Review context</Button></ContextMenuTrigger><ContextMenuContent>{menuItems("context")}</ContextMenuContent></ContextMenu></div>
      <div id="menubar-case"><h3>Menubar</h3><Menubar><MenubarMenu><MenubarTrigger>Review menubar</MenubarTrigger><MenubarContent>{menuItems("menubar")}</MenubarContent></MenubarMenu></Menubar></div>
      <div id="navigation-case"><h3>Navigation menu</h3><NavigationMenu><NavigationMenuList><NavigationMenuItem value="review"><NavigationMenuTrigger>Review navigation</NavigationMenuTrigger><NavigationMenuContent>{options.map(option => <NavigationMenuLink key={option.value} href={`#${option.value}`} adornment={option.adornment} onClick={event => { event.preventDefault(); setEvent(`navigation:${option.value}`); }}>{option.label}</NavigationMenuLink>)}</NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu></div>
    </div></section><section id="command-case"><h2>Command</h2><Command><CommandInput aria-label="Review commands" /><CommandList><CommandEmpty>No matching commands</CommandEmpty>{options.map(option => <CommandItem key={option.value} value={option.value} disabled={option.disabled} adornment={option.adornment} onSelect={value => setEvent(`command:${value}`)}>{option.label}</CommandItem>)}</CommandList></Command></section><section id="appearance-case"><h2>Appearance scroll fit</h2><AppearanceMenu /></section><output id="review-events" aria-live="polite">{event}</output></>;
}
createRoot(host).render(<AppearanceProvider><Fixture /></AppearanceProvider>);
