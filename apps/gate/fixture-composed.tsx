import * as React from "react";
import type { FixtureContext, FixtureProps } from "./fixture-shared";
import * as attachment from "@/registry/sahajiv/ui/attachment";
import * as breadcrumb from "@/registry/sahajiv/ui/breadcrumb";
import * as button_group from "@/registry/sahajiv/ui/button-group";
import * as carousel from "@/registry/sahajiv/ui/carousel";
import * as chart from "@/registry/sahajiv/ui/chart";
import * as data_table from "@/registry/sahajiv/ui/data-table";
import * as dropzone from "@/registry/sahajiv/ui/dropzone";
import * as field from "@/registry/sahajiv/ui/field";
import * as input from "@/registry/sahajiv/ui/input";
import * as input_group from "@/registry/sahajiv/ui/input-group";
import * as message_scroller from "@/registry/sahajiv/ui/message-scroller";
import * as native_select from "@/registry/sahajiv/ui/native-select";
import * as pagination from "@/registry/sahajiv/ui/pagination";
import * as questionnaire from "@/registry/sahajiv/ui/questionnaire";
import * as sidebar from "@/registry/sahajiv/ui/sidebar";
import * as stepper from "@/registry/sahajiv/ui/stepper";
import * as table from "@/registry/sahajiv/ui/table";
import * as textarea from "@/registry/sahajiv/ui/textarea";

const simple:Record<string,React.ElementType>={
  ".v-attach":attachment.Attachment,".v-attach__name":attachment.AttachmentName,".v-attach__meta":attachment.AttachmentMeta,
  ".v-crumbs":breadcrumb.Breadcrumb,
  ".v-carousel__track":carousel.CarouselContent,".v-carousel__nav":carousel.CarouselNavigation,".v-carousel__dots":carousel.CarouselDots,".v-deck":carousel.CarouselDeck,
  ".v-axis":chart.ChartAxis,".v-line":chart.ChartLine,".v-ring__c":chart.ChartRingCenter,".v-prow":chart.ChartRankedRow,".v-prow__lab":chart.ChartRankedLabel,".v-prow__val":chart.ChartRankedValue,
  ".v-drop":dropzone.Dropzone,
  ".v-affix":input.InputAffix,".v-clear":input.InputClear,
  ".v-igroup":input_group.InputGroup,".v-addon":input_group.InputGroupAddon,".v-search":input_group.InputSearch,".v-scope":input_group.InputSearchScope,".v-search__disk":input_group.InputSearchDisk,
  ".v-scroller":message_scroller.MessageScroller,".v-scroller__jump":message_scroller.MessageScrollerJump,
  ".v-native":native_select.NativeSelect,
  ".v-quest":questionnaire.Questionnaire,".v-weekdays":questionnaire.QuestionnaireWeekdays,".v-weekdays > label":questionnaire.QuestionnaireWeekday,".v-quest__q":questionnaire.QuestionnaireQuestion,".v-quest__opt-body":questionnaire.QuestionnaireOptionBody,
  ".v-stepper-flow":stepper.StepperList,".v-step__t":stepper.StepperTitle,"[data-step-back]":stepper.StepperPrevious,"[data-step-next]":stepper.StepperNext,"[data-step-say]":stepper.StepperStatus,
  ".v-table":table.Table,
  ".v-textarea":textarea.Textarea,".v-composer":textarea.TextareaComposer,".v-composer__bar":textarea.TextareaComposerBar,".v-composer__count":textarea.TextareaCount,
};
const sideParts:Record<string,React.ElementType>={".v-brand":sidebar.SidebarHeader,".v-collapse":sidebar.SidebarTrigger,".v-nav":sidebar.SidebarContent,".v-nav__group":sidebar.SidebarGroupLabel,".v-nav__item":sidebar.SidebarMenuButton,".v-nav__label":sidebar.SidebarMenuLabel,".v-nav__count":sidebar.SidebarMenuBadge,".v-sidebar__foot":sidebar.SidebarFooter};
const tableParts:Record<string,React.ElementType>={THEAD:table.TableHeader,TBODY:table.TableBody,TFOOT:table.TableFooter,TR:table.TableRow,TH:table.TableHead,TD:table.TableCell,CAPTION:table.TableCaption};
function siblingIndex(node:Element,selector:string){return Array.from(node.parentElement?.querySelectorAll(":scope > "+selector)??[]).indexOf(node)}
function chosenValue(input:Element|null,index:number){return input?.getAttribute("value")??String(index)}

/** Translate authored content into production APIs; no reference behavior runs here. */
export function convertComposed(node:Element,index:number,ctx:FixtureContext):React.ReactNode|undefined{
  const render=(Component:React.ElementType,props:FixtureProps={},children?:React.ReactNode)=>{
    ctx.mark(node);
    return ctx.convert(node,index,{skipComposed:true,skipInteractive:true,Component,props,...(children!==undefined?{children}:{})});
  };
  const matches=(selector:string)=>node.matches(selector);
  if(node.querySelector(":scope > .v-stepper-flow")){
    const list=node.querySelector(":scope > .v-stepper-flow")!;
    const steps=Array.from(list.querySelectorAll(":scope > .v-step"));
    return render(stepper.Stepper,{count:steps.length,defaultValue:Math.max(1,steps.findIndex(step=>step.matches(".-on,[aria-current=step]"))+1),labels:steps.map(step=>step.querySelector(".v-step__t")?.textContent??"")});
  }
  if(matches(".v-step,.v-step__n")){
    const step=matches(".v-step")?node:node.closest(".v-step")!;
    return render(matches(".v-step")?stepper.StepperItem:stepper.StepperIndicator,{step:siblingIndex(step,".v-step")+1});
  }
  if(matches(".v-sidebar"))return render(sidebar.Sidebar,{defaultOpen:!matches(".-mini,.-collapsed"),layout:"viewport"});
  if(node.closest(".v-sidebar"))for(const[selector,Component]of Object.entries(sideParts))if(matches(selector))return render(Component,selector===".v-nav__item"?{isActive:node.getAttribute("aria-current")==="page"}:{});
  if(matches(".v-seg")&&ctx.id==="button-group"){
    const selected=node.querySelector(":scope > [aria-pressed=true]");
    return render(button_group.ButtonGroup,{defaultValue:selected?String(Array.from(node.children).indexOf(selected)):undefined});
  }
  if(matches(".v-seg > .v-btn")&&ctx.id==="button-group")return render(button_group.ButtonGroupItem,{value:String(Array.from(node.parentElement!.children).indexOf(node)),"aria-pressed":undefined});
  if(matches(".v-utility")&&ctx.id==="button-group")return render(button_group.ButtonGroupUtility,{shapes:node.hasAttribute("data-shapes")});
  if(matches(".v-utility .v-ibtn")&&ctx.id==="button-group")return render(button_group.ButtonGroupUtilityItem);
  if(matches(".v-attach .v-disk"))return render(attachment.AttachmentType);
  if(matches(".v-attach .v-actions"))return render(attachment.AttachmentActions);
  if(matches(".v-attach .v-ibtn"))return render(attachment.AttachmentAction);
  if(matches(".v-crumbs > .v-ibtn:first-child"))return render(breadcrumb.BreadcrumbBack);
  if(matches(".v-crumbs a"))return render(breadcrumb.BreadcrumbLink);
  if(matches(".v-crumbs [aria-current=page]"))return render(breadcrumb.BreadcrumbPage);
  if(matches(".v-carousel__nav"))return render(carousel.CarouselNavigation,{},node.querySelector(".v-carousel__dots")?ctx.children(node):[<carousel.CarouselDots key="dots"/>,...ctx.children(node)]);
  if(matches(".v-carousel__dots"))return render(carousel.CarouselDots,{},node.childNodes.length?ctx.children(node):null);
  if(matches(".v-carousel"))return render(carousel.Carousel);
  if(matches(".v-carousel__track > *"))return <carousel.CarouselItem key={index} asChild>{ctx.convert(node,index,{skipComposed:true})}</carousel.CarouselItem>;
  if(matches(".v-carousel__nav > button:first-of-type"))return render(carousel.CarouselPrevious);
  if(matches(".v-carousel__nav > button:last-of-type"))return render(carousel.CarouselNext);
  if(matches(".v-carousel__dots > button"))return render(carousel.CarouselDot,{index:siblingIndex(node,"button")});
  if(matches(".v-bars"))return render(chart.Chart,{showTable:false});
  if(matches(".v-bars > i"))return render(chart.ChartBar,{value:parseFloat((node as HTMLElement).style.getPropertyValue("--p")),max:100,variant:matches(".-dash")?"dash":matches(".-ink")?"ink":"default"});
  if(matches(".v-line path"))return render(chart.ChartLinePath);
  if(matches(".v-ring")){
    const legends=(node.getAttribute("data-legend")??"").split(",");
    const segments=(node.getAttribute("data-segs")??"").split(",").filter(Boolean).map((part,i)=>{const[color,value]=part.split(":");return{label:legends[i]??color,color,value:Number(value)}});
    return <React.Fragment key={index}>{render(chart.ChartRing,{segments,strokeWidth:Number(node.getAttribute("data-sw")??12),gap:Number(node.getAttribute("data-gap")??6),unit:node.getAttribute("data-unit")??"",draw:matches(".-draw"),showTable:false})}<chart.ChartDataTable data-gate="table/default/default/rest" data={segments} /></React.Fragment>;
  }
  if(matches(".v-table-wrap"))return render(ctx.id==="data-table"?data_table.DataTableViewport:table.TableContainer);
  if(matches(".v-tabs[data-filters]"))return render(data_table.DataTableFilters);
  if(matches("[data-filters] > .v-tab"))return render(data_table.DataTableFilterButton,{pressed:node.getAttribute("aria-pressed")==="true"});
  if(matches(".v-state.-filtered")&&ctx.id==="data-table")return render(data_table.DataTableEmpty);
  if(matches(".v-pager"))return render(ctx.id==="data-table"?data_table.DataTablePagination:pagination.Pagination,{defaultPage:Number(node.getAttribute("data-page")??1),totalPages:Number(node.getAttribute("data-pages")??1)});
  if(matches(".v-pager button[data-p]"))return render(pagination.PaginationLink,{isActive:node.getAttribute("aria-current")==="page"});
  if(matches(".v-pager .v-ellipsis"))return render(pagination.PaginationEllipsis);
  if(node.closest(".v-table")&&tableParts[node.tagName])return render(tableParts[node.tagName],{numeric:matches(".-num")});
  if(matches(".v-field"))return render(field.Field,{controlId:node.querySelector("[id]")?.id,invalid:matches(".-invalid")});
  if(matches(".v-field > .v-label"))return render(field.FieldLabel);
  if(matches(".v-help"))return render(node.closest(".v-field.-invalid")?field.FieldError:field.FieldDescription);
  if(matches(".v-input"))return render(node.tagName==="INPUT"?input.Input:input.InputWrapper,node.tagName==="LABEL"?{as:"label"}:{});
  if(matches(".v-input input"))return render(input.InputControl);
  if(matches(".v-input .v-disk"))return render(input.InputAddon);
  if(matches(".v-igroup > input"))return render(input_group.InputGroupInput);
  if(matches(".v-igroup > .v-btn"))return render(input_group.InputGroupButton);
  if(matches(".v-native > option"))return render(native_select.NativeSelectOption);
  if(matches(".v-native > optgroup"))return render(native_select.NativeSelectOptGroup);
  if(matches(".v-quest__progress"))return render(questionnaire.QuestionnaireProgress,{value:Number(node.querySelector("b")?.textContent??2),total:3});
  if(matches(".v-quest__q > .v-label"))return render(questionnaire.QuestionnaireLabel);
  if(matches(".v-quest__opts")){
    const options=Array.from(node.querySelectorAll(":scope > .v-quest__opt"));
    const checked=options.findIndex(option=>option.querySelector("input[checked]"));
    return render(questionnaire.QuestionnaireOptions,{name:node.querySelector("input")?.getAttribute("name")??undefined,defaultValue:checked<0?undefined:chosenValue(options[checked].querySelector("input"),checked)});
  }
  if(matches(".v-quest__opt")){
    const control=node.querySelector(":scope > input");
    return render(questionnaire.QuestionnaireOption,{value:chosenValue(control,siblingIndex(node,".v-quest__opt")),disabled:control?.hasAttribute("disabled"),inputProps:control?{id:control.id||undefined,"aria-label":control.getAttribute("aria-label")??undefined}:undefined},Array.from(node.childNodes).filter(child=>child!==control).map((child,i)=>ctx.convert(child,i)));
  }
  for(const[selector,Component]of Object.entries(simple))if(matches(selector))return render(Component);
  return undefined;
}
