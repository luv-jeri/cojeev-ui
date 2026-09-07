import React from "react";
import { createPortal } from "react-dom";
import * as AccordionParts from "@/registry/sahajiv/ui/accordion";
import * as AlertDialogParts from "@/registry/sahajiv/ui/alert-dialog";
import * as CalendarParts from "@/registry/sahajiv/ui/calendar";
import * as CheckboxParts from "@/registry/sahajiv/ui/checkbox";
import * as CollapsibleParts from "@/registry/sahajiv/ui/collapsible";
import * as ComboboxParts from "@/registry/sahajiv/ui/combobox";
import * as CommandParts from "@/registry/sahajiv/ui/command";
import * as ContextMenuParts from "@/registry/sahajiv/ui/context-menu";
import * as DatePickerParts from "@/registry/sahajiv/ui/date-picker";
import * as DialogParts from "@/registry/sahajiv/ui/dialog";
import * as DrawerParts from "@/registry/sahajiv/ui/drawer";
import * as DropdownMenuParts from "@/registry/sahajiv/ui/dropdown-menu";
import * as HoverCardParts from "@/registry/sahajiv/ui/hover-card";
import * as InputOtpParts from "@/registry/sahajiv/ui/input-otp";
import * as MenubarParts from "@/registry/sahajiv/ui/menubar";
import * as NavigationMenuParts from "@/registry/sahajiv/ui/navigation-menu";
import * as PopoverParts from "@/registry/sahajiv/ui/popover";
import * as RadioGroupParts from "@/registry/sahajiv/ui/radio-group";
import * as ResizableParts from "@/registry/sahajiv/ui/resizable";
import * as ScrollAreaParts from "@/registry/sahajiv/ui/scroll-area";
import * as SelectParts from "@/registry/sahajiv/ui/select";
import * as SheetParts from "@/registry/sahajiv/ui/sheet";
import * as SliderParts from "@/registry/sahajiv/ui/slider";
import * as SwitchParts from "@/registry/sahajiv/ui/switch";
import * as TabsParts from "@/registry/sahajiv/ui/tabs";
import * as ToastParts from "@/registry/sahajiv/ui/toast";
import * as ToggleParts from "@/registry/sahajiv/ui/toggle";
import * as ToggleGroupParts from "@/registry/sahajiv/ui/toggle-group";
import * as TooltipParts from "@/registry/sahajiv/ui/tooltip";
import { Button } from "@/registry/sahajiv/ui/button";
import {
  type FixtureContext,
  type FixtureProps,
  omit,
  textValue,
  localDate,
} from "./fixture-shared";

type Parts = Record<string, React.ElementType>;
function clear(props: FixtureProps, ...names: string[]): FixtureProps {
  return {
    ...props,
    ...Object.fromEntries(names.map((name) => [name, undefined])),
  };
}
const elementChildren = (node: Element) => Array.from(node.children);
const withoutInput = (node: Element, ctx: FixtureContext) =>
  Array.from(node.childNodes)
    .filter((child) => !(child instanceof Element && child.matches("input")))
    .map((child, i) => ctx.convert(child, i));
function render(
  Component: React.ElementType,
  node: Element,
  ctx: FixtureContext,
  extra: FixtureProps = {},
  children: React.ReactNode = ctx.children(node),
  key?: React.Key,
) {
  ctx.mark(node);
  return React.createElement(
    Component,
    Object.fromEntries(
      Object.entries({ ...ctx.props(node), ...extra, key }).filter(
        ([, value]) => value !== undefined,
      ),
    ),
    Array.isArray(children) && children.length === 0 ? undefined : children,
  );
}
function native(
  node: Element,
  ctx: FixtureContext,
  children: React.ReactNode,
  key?: React.Key,
) {
  return React.createElement(
    node.tagName.toLowerCase(),
    { ...ctx.props(node), key },
    children,
  );
}
function controlledProps(node: Element, ctx: FixtureContext) {
  return clear(
    ctx.props(node),
    "aria-selected",
    "aria-pressed",
    "aria-expanded",
    "aria-controls",
    "aria-checked",
    "role",
    "hidden",
    "open",
    "defaultChecked",
    "defaultValue",
  );
}
function inputState(node: Element, ctx: FixtureContext) {
  const input = node.querySelector("input");
  if (!input) return {};
  return {
    ...clear(ctx.props(input), "type", "defaultValue", "defaultChecked"),
    defaultChecked: input.hasAttribute("data-indeterminate")
      ? "indeterminate"
      : input.hasAttribute("checked"),
  };
}
function calendarProps(node: Element, ctx: FixtureContext): FixtureProps {
  const marks = Object.fromEntries(
    (node.getAttribute("data-marks") ?? "")
      .split(",")
      .filter(Boolean)
      .map((mark) => mark.split(":")),
  );
  return {
    ...ctx.props(node),
    defaultMonth: localDate(node.getAttribute("data-date")),
    defaultSelected: localDate(node.getAttribute("data-selected")),
    marks,
  };
}

/** Modals replace the source sibling trigger/content with one real provider. */
function modal(
  node: Element,
  ctx: FixtureContext,
  index: number,
): React.ReactNode | undefined {
  const content = elementChildren(node).find((child) =>
    child.matches("[data-dialog],[data-sheet],[data-drawer]"),
  );
  if (!content) return undefined;
  const kind = content.hasAttribute("data-drawer")
    ? "Drawer"
    : content.hasAttribute("data-sheet")
      ? "Sheet"
      : content.getAttribute("role") === "alertdialog"
        ? "AlertDialog"
        : "Dialog";
  const parts = {
    Drawer: DrawerParts,
    Sheet: SheetParts,
    AlertDialog: AlertDialogParts,
    Dialog: DialogParts,
  }[kind] as unknown as Parts;
  const titleId = content.getAttribute("aria-labelledby");
  let hasDescription = false;
  function part(child: Node, i: number): React.ReactNode {
    if (!(child instanceof Element)) return child.textContent;
    if (child.hasAttribute("data-close")) {
      const name =
        kind === "AlertDialog"
          ? child.classList.contains("-danger")
            ? "Action"
            : "Cancel"
          : "Close";
      return React.createElement(
        parts[kind + name],
        { key: i, asChild: true },
        ctx.convert(child, i, { skipInteractive: true }),
      );
    }
    const name = child.classList.contains("v-dialog__head")
      ? "Header"
      : child.classList.contains("v-dialog__actions")
        ? "Footer"
        : child.id === titleId
          ? "Title"
          : child.classList.contains("v-body-2")
            ? "Description"
            : undefined;
    if (name === "Description") hasDescription = true;
    if (name)
      return render(
        parts[kind + name],
        child,
        ctx,
        {},
        Array.from(child.childNodes).map(part),
        i,
      );
    return ctx.convert(child, i, {
      children: Array.from(child.childNodes).map(part),
    });
  }
  const contentChildren = Array.from(content.childNodes).map(part);
  const contentProps = {
    ...controlledProps(content, ctx),
    ...(hasDescription ? {} : { "aria-describedby": undefined }),
  };
  const tree = elementChildren(node).map((child, i) => {
    if (child === content)
      return render(
        parts[kind + "Content"],
        child,
        ctx,
        contentProps,
        contentChildren,
        i,
      );
    if (
      child.hasAttribute("data-dialog-open") ||
      child.hasAttribute("data-sheet-open") ||
      child.hasAttribute("data-drawer-open")
    ) {
      return React.createElement(
        parts[kind + "Trigger"],
        { key: i, asChild: true },
        ctx.convert(child, i, { skipInteractive: true }),
      );
    }
    return ctx.convert(child, i);
  });
  ctx.mark(content);
  return native(
    node,
    ctx,
    React.createElement(parts[kind], { defaultOpen: false }, tree),
    index,
  );
}

function menuItems(
  menu: Element,
  ctx: FixtureContext,
  prefix: string,
  parts: Parts,
): React.ReactNode[] {
  return elementChildren(menu).map((child, i) => {
    const name = child.classList.contains("v-menu__sep")
      ? "Separator"
      : child.classList.contains("v-menu__group")
        ? "Label"
        : "Item";
    return render(
      parts[prefix + name],
      child,
      ctx,
      controlledProps(child, ctx),
      ctx.children(child),
      i,
    );
  });
}
function MenuFixture({
  node,
  ctx,
  kind,
}: {
  node: Element;
  ctx: FixtureContext;
  kind: "DropdownMenu" | "Popover" | "ContextMenu";
}) {
  const parts = {
    DropdownMenu: DropdownMenuParts,
    Popover: PopoverParts,
    ContextMenu: ContextMenuParts,
  }[kind] as unknown as Parts;
  const menu = elementChildren(node).find((child) => child.matches(".v-menu"))!;
  const trigger = elementChildren(node).find(
    (child) =>
      child.hasAttribute("data-menu") || child.hasAttribute("data-context"),
  )!;
  const contentChildren =
    kind === "Popover" ? ctx.children(menu) : menuItems(menu, ctx, kind, parts);
  const tree = (
    <>
      {React.createElement(
        parts[kind + "Trigger"],
        { asChild: true },
        ctx.convert(trigger, 0, {
          skipInteractive: true,
          props: { "aria-expanded": undefined },
        }),
      )}
      {render(
        parts[kind + "Content"],
        menu,
        ctx,
        { ...controlledProps(menu, ctx), align: "start" },
        contentChildren,
      )}
    </>
  );
  return native(
    node,
    ctx,
    React.createElement(
      parts[kind],
      kind === "ContextMenu" ? {} : { defaultOpen: false },
      tree,
    ),
  );
}

function SelectFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const trigger = node.querySelector(":scope > .v-select")!;
  const menu = node.querySelector(":scope > .v-listbox")!;
  const items = elementChildren(menu).filter((child) =>
    child.matches(".v-menu__item"),
  );
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.getAttribute("aria-selected") === "true"),
  );
  const [value, setValue] = React.useState(String(selectedIndex));
  const firstValue = trigger.querySelector("[data-value]");
  const triggerPrefix = elementChildren(trigger).filter(
    (child) =>
      !child.matches("[data-value],.v-icon") &&
      !child.querySelector("[data-value]"),
  );
  // A custom trigger label retains its authored disk and text layout. The selected
  // value is derived from the real Select state, so choosing another option updates it.
  const current = items[Number(value)];
  const label = firstValue ? (
    <SelectParts.SelectValue data-value="">
      {textValue(current)}
    </SelectParts.SelectValue>
  ) : (
    <SelectParts.SelectValue />
  );
  const decorated = trigger.querySelector("[data-value]")?.parentElement;
  const disk =
    decorated !== trigger ? decorated?.querySelector(".v-disk") : null;
  const labelTree = disk ? (
    <span>
      {ctx.convert(current?.querySelector(".v-disk") ?? disk)}
      {label}
    </span>
  ) : (
    <>
      {triggerPrefix.map((child, i) => ctx.convert(child, i))}
      {label}
    </>
  );
  ctx.mark(node);
  return (
    <SelectParts.Select
      value={value}
      onValueChange={setValue}
      defaultOpen={false}
      containerProps={ctx.props(node)}
    >
      {render(
        SelectParts.SelectTrigger,
        trigger,
        ctx,
        controlledProps(trigger, ctx),
        labelTree,
      )}
      {render(
        SelectParts.SelectContent,
        menu,
        ctx,
        controlledProps(menu, ctx),
        items.map((item, i) =>
          render(
            SelectParts.SelectItem,
            item,
            ctx,
            {
              ...controlledProps(item, ctx),
              value: String(i),
              textValue: textValue(item),
            },
            ctx.children(item),
            i,
          ),
        ),
      )}
    </SelectParts.Select>
  );
}

function DateFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const trigger = node.querySelector(":scope > button")!;
  const content = node.querySelector(":scope > .v-popover")!;
  const calendar = content.querySelector(".v-cal")!;
  const [selected, setSelected] = React.useState(
    localDate(calendar.getAttribute("data-selected")),
  );
  const [isOpen, setOpen] = React.useState(false);
  const label = selected?.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const triggerChildren = Array.from(trigger.childNodes).map((child, i) =>
    child instanceof Element && child.hasAttribute("data-value")
      ? native(child, ctx, label, i)
      : ctx.convert(child, i),
  );
  ctx.mark(node);
  return (
    <PopoverParts.Popover open={isOpen} onOpenChange={setOpen}>
      {native(
        node,
        ctx,
        <>
          {render(
            DatePickerParts.DatePickerTrigger,
            trigger,
            ctx,
            controlledProps(trigger, ctx),
            triggerChildren,
          )}
          {render(
            DatePickerParts.DatePickerContent,
            content,
            ctx,
            {
              ...controlledProps(content, ctx),
              style: omit(
                (ctx.props(content).style ?? {}) as FixtureProps,
                "position",
                "top",
                "left",
                "zIndex",
              ),
            },
            render(
              CalendarParts.Calendar,
              calendar,
              ctx,
              {
                ...calendarProps(calendar, ctx),
                selected,
                onSelect: (date: Date | undefined) => {
                  setSelected(date);
                  setOpen(false);
                },
              },
              undefined,
            ),
          )}
        </>,
      )}
    </PopoverParts.Popover>
  );
}

/** Source --split includes the handle; the panel library percentages exclude it. */
function ResizableFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const vertical = node.classList.contains("-v");
  const panels = elementChildren(node).filter(child => child.matches(".v-resizable__pane"));
  const initialSplit = parseFloat((node as HTMLElement).style.getPropertyValue("--split")) || 50;
  const splitRef = React.useRef(initialSplit);
  const elementRef = React.useRef<HTMLDivElement>(null);
  const groupRef = React.useRef<import("react-resizable-panels").GroupImperativeHandle>(null);
  React.useEffect(() => {
    const group = elementRef.current;
    if (!group) return;
    const observer = new ResizeObserver(() => {
      const bounds = group.getBoundingClientRect();
      const total = vertical ? bounds.height : bounds.width;
      const handle = group.querySelector('[data-slot="resizable-handle"]')?.getBoundingClientRect();
      const available = total - (vertical ? handle?.height ?? 0 : handle?.width ?? 0);
      if (available <= 0) return;
      // Chromium grid tracks floor to layout units; flex percentages round.
      // Seed the actual source track size, then let the library own interaction.
      const sourceTrack = Math.floor(splitRef.current * total / 100 * 64) / 64;
      const first = sourceTrack * 100 / available;
      groupRef.current?.setLayout({ "fixture-first": first, "fixture-last": 100 - first });
    });
    observer.observe(group);
    return () => observer.disconnect();
  }, [vertical]);
  ctx.mark(node);
  return <ResizableParts.ResizablePanelGroup
    {...ctx.props(node)}
    direction={vertical ? "vertical" : "horizontal"}
    elementRef={elementRef}
    groupRef={groupRef}
    onLayoutChanged={(layout, meta) => {
      const group = elementRef.current;
      if (!meta.isUserInteraction || !group) return;
      const bounds = group.getBoundingClientRect();
      const total = vertical ? bounds.height : bounds.width;
      const handle = group.querySelector('[data-slot="resizable-handle"]')?.getBoundingClientRect();
      const available = total - (vertical ? handle?.height ?? 0 : handle?.width ?? 0);
      splitRef.current = layout["fixture-first"] * available / total;
    }}
  >{elementChildren(node).map((child, i) => child.matches(".v-resizable__handle")
    ? render(ResizableParts.ResizableHandle, child, ctx, {}, undefined, i)
    : render(ResizableParts.ResizablePanel, child, ctx, {
      id: panels.indexOf(child) === 0 ? "fixture-first" : "fixture-last",
      defaultSize: `${panels.indexOf(child) === 0 ? initialSplit : 100 - initialSplit}%`,
    }, ctx.children(child), i))}</ResizableParts.ResizablePanelGroup>;
}

function SliderFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const input = node.querySelector("input.v-slider")!;
  const [value, setValue] = React.useState([
    Number(input.getAttribute("value") ?? 0),
  ]);
  const unit = input.getAttribute("data-unit") ?? "";
  const convertPart = (child: Node, i: number): React.ReactNode => {
    if (!(child instanceof Element)) return child.textContent;
    if (child === input)
      return render(
        SliderParts.Slider,
        input,
        ctx,
        {
          ...clear(ctx.props(input), "type", "defaultValue"),
          min: Number(input.getAttribute("min") ?? 0),
          max: Number(input.getAttribute("max") ?? 100),
          step: Number(input.getAttribute("step") ?? 1),
          value,
          onValueChange: setValue,
        },
        undefined,
        i,
      );
    if (child.matches("output"))
      return render(
        SliderParts.SliderOutput,
        child,
        ctx,
        {},
        `${value[0]}${unit}`,
        i,
      );
    if (child.matches(".v-sliderwrap__row"))
      return render(
        SliderParts.SliderRow,
        child,
        ctx,
        {},
        Array.from(child.childNodes).map(convertPart),
        i,
      );
    return ctx.convert(child, i);
  };
  return render(
    SliderParts.SliderWrapper,
    node,
    ctx,
    {},
    Array.from(node.childNodes).map(convertPart),
  );
}

function RadioFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const items = elementChildren(node).filter((child) =>
    child.matches(".v-radio,.v-iradio"),
  );
  // Native radios with one name resolve duplicate checked attributes to the last input.
  const selected = items.findLastIndex((item) =>
    (item.querySelector("input") as HTMLInputElement | null)?.checked,
  );
  const pictographic = node.classList.contains("v-iradios");
  return render(
    RadioGroupParts.RadioGroup,
    node,
    ctx,
    {
      defaultValue: selected >= 0 ? String(selected) : undefined,
      name: items[0]?.querySelector("input")?.getAttribute("name") ?? undefined,
      pictographic,
      "data-fixture-authored-radio-root": node.matches(".v-radios,.v-iradios") || undefined,
      // Source inline groups have only authored layout, without the v-radios gap.
      className: node.className || undefined,
    },
    items.map((item, i) =>
      render(
        RadioGroupParts.RadioGroupItem,
        item,
        ctx,
        {
          ...omit(inputState(item, ctx), "defaultChecked", "name"),
          value: String(i),
          pictographic,
        },
        withoutInput(item, ctx),
        i,
      ),
    ),
  );
}

function ToastFixture({ node, ctx }: { node: Element; ctx: FixtureContext }) {
  const [isOpen, setOpen] = React.useState(false);
  const [hasOpened, setHasOpened] = React.useState(false);
  const kind = node.getAttribute("data-kind")?.replace(/^-/, "") as
    "cream" | "danger" | undefined;
  const action = node.getAttribute("data-action");
  return (
    <ToastParts.ToastProvider>
      {ctx.convert(node, 0, {
        skipInteractive: true,
        props: { onClick: () => { setHasOpened(true); setOpen(true); } },
      })}
      <ToastParts.Toast
        open={isOpen}
        onOpenChange={setOpen}
        variant={kind}
        durable={node.hasAttribute("data-durable")}
      >
        <ToastParts.ToastDescription>
          {node.getAttribute("data-toast")}
        </ToastParts.ToastDescription>
        {action && (
          <ToastParts.ToastAction asChild altText={action}>
            <Button size="sm" onClick={() => setOpen(false)}>
              {action}
            </Button>
          </ToastParts.ToastAction>
        )}
        <ToastParts.ToastClose />
      </ToastParts.Toast>
      {hasOpened && createPortal(<ToastParts.ToastViewport />, document.body)}
    </ToastParts.ToastProvider>
  );
}

export function convertInteractive(
  node: Element,
  index: number,
  ctx: FixtureContext,
): React.ReactNode | undefined {
  const modalTree = modal(node, ctx, index);
  if (modalTree !== undefined) return modalTree;
  if (node.matches(".v-acc")) {
    const items = elementChildren(node).filter((child) =>
      child.matches("details"),
    );
    return render(
      AccordionParts.Accordion,
      node,
      ctx,
      {
        type: "multiple",
        defaultValue: items.flatMap((item, i) =>
          item.hasAttribute("open") ? [String(i)] : [],
        ),
      },
      items.map((item, i) => {
        const summary = item.querySelector(":scope > summary")!;
        const indicator = summary.querySelector(".v-chev");
        const triggerChildren = Array.from(summary.childNodes)
          .filter((child) => child !== indicator)
          .map((child, j) => ctx.convert(child, j));
        return render(
          AccordionParts.AccordionItem,
          item,
          ctx,
          { ...clear(ctx.props(item), "open"), value: String(i) },
          <>
            {render(
              AccordionParts.AccordionTrigger,
              summary,
              ctx,
              {
                indicator: indicator
                  ? render(
                      AccordionParts.AccordionIndicator,
                      indicator,
                      ctx,
                      {},
                      undefined,
                    )
                  : undefined,
              },
              triggerChildren,
            )}
            {elementChildren(item)
              .filter((child) => child !== summary)
              .map((child, j) =>
                render(
                  AccordionParts.AccordionContent,
                  child,
                  ctx,
                  {},
                  ctx.children(child),
                  j,
                ),
              )}
          </>,
          i,
        );
      }),
      index,
    );
  }
  if (node.matches("details.v-collapsible")) {
    const summary = node.querySelector(":scope > summary")!;
    const indicator = summary.querySelector(".v-chev");
    return render(
      CollapsibleParts.Collapsible,
      node,
      ctx,
      {
        ...clear(ctx.props(node), "open"),
        defaultOpen: node.hasAttribute("open"),
      },
      <>
        {render(
          CollapsibleParts.CollapsibleTrigger,
          summary,
          ctx,
          {},
          Array.from(summary.childNodes).map((child, i) =>
            child === indicator
              ? render(
                  CollapsibleParts.CollapsibleIndicator,
                  indicator!,
                  ctx,
                  {},
                  undefined,
                  i,
                )
              : ctx.convert(child, i),
          ),
        )}
        {elementChildren(node)
          .filter((child) => child !== summary)
          .map((child, i) =>
            render(
              CollapsibleParts.CollapsibleContent,
              child,
              ctx,
              {},
              ctx.children(child),
              i,
            ),
          )}
      </>,
      index,
    );
  }
  if (node.matches(".v-check"))
    return render(
      CheckboxParts.Checkbox,
      node,
      ctx,
      { ...controlledProps(node, ctx), ...inputState(node, ctx) },
      withoutInput(node, ctx),
      index,
    );
  if (node.matches(".v-checks"))
    return render(
      CheckboxParts.CheckboxGroup,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (node.matches(".v-check__body"))
    return render(
      CheckboxParts.CheckboxBody,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (node.matches(".v-switch"))
    return render(
      SwitchParts.Switch,
      node,
      ctx,
      { ...controlledProps(node, ctx), ...inputState(node, ctx) },
      undefined,
      index,
    );
  if (node.matches(".v-switchrow"))
    return render(
      SwitchParts.SwitchRow,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (
    node.matches(".v-radios,.v-iradios") ||
    elementChildren(node).some((child) => child.matches(".v-radio,.v-iradio"))
  ) {
    ctx.mark(node);
    return <RadioFixture key={index} node={node} ctx={ctx} />;
  }
  if (node.matches(".v-radio__body"))
    return render(
      RadioGroupParts.RadioGroupBody,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (node.hasAttribute("data-togglegroup")) {
    const items = elementChildren(node).filter((child) =>
      child.matches("button"),
    );
    const active = items.flatMap((item, i) =>
      item.getAttribute("aria-pressed") === "true" ? [String(i)] : [],
    );
    const multiple = node.getAttribute("data-togglegroup") === "multi";
    return render(
      ToggleGroupParts.ToggleGroup,
      node,
      ctx,
      {
        type: multiple ? "multiple" : "single",
        defaultValue: multiple ? active : active[0],
      },
      items.map((item, i) => {
        const extra = { ...controlledProps(item, ctx), value: String(i) };
        if (item.matches(".v-btn"))
          return React.createElement(
            ToggleGroupParts.ToggleGroupItem,
            { key: i, value: String(i), asChild: true },
            ctx.convert(item, i, {
              skipInteractive: true,
              props: { "aria-pressed": undefined },
            }),
          );
        return render(
          ToggleGroupParts.ToggleGroupItem,
          item,
          ctx,
          extra,
          ctx.children(item),
          i,
        );
      }),
      index,
    );
  }
  if (node.matches(".v-toggle"))
    return render(
      ToggleParts.Toggle,
      node,
      ctx,
      {
        ...controlledProps(node, ctx),
        defaultPressed: node.getAttribute("aria-pressed") === "true",
      },
      ctx.children(node),
      index,
    );
  if (node.matches(".v-togglewell"))
    return render(
      ToggleParts.ToggleWell,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (node.matches(".v-tabs") && !node.hasAttribute("data-filters")) {
    const items = elementChildren(node).filter((child) =>
      child.matches(".v-tab"),
    );
    const active = items.findIndex(
      (item) => item.getAttribute("aria-selected") === "true",
    );
    const variant = node.classList.contains("-underline")
      ? "underline"
      : node.classList.contains("-lenses")
        ? "lenses"
        : node.classList.contains("-pills")
          ? "pills"
          : "default";
    ctx.mark(node);
    return (
      <TabsParts.Tabs
        asChild
        key={index}
        defaultValue={String(Math.max(0, active))}
        variant={variant}
      >
        {render(
          TabsParts.TabsList,
          node,
          ctx,
          { ...controlledProps(node, ctx), variant },
          items.map((item, i) =>
            render(
              TabsParts.TabsTrigger,
              item,
              ctx,
              { ...controlledProps(item, ctx), value: String(i) },
              ctx.children(item),
              i,
            ),
          ),
        )}
      </TabsParts.Tabs>
    );
  }
  if (node.matches(".v-sliderwrap")) {
    ctx.mark(node);
    return <SliderFixture key={index} node={node} ctx={ctx} />;
  }
  if (node.matches(".v-scroll"))
    return render(
      ScrollAreaParts.ScrollArea,
      node,
      ctx,
      { variant: node.classList.contains("-ink") ? "ink" : "default" },
      ctx.children(node),
      index,
    );
  if (node.matches(".v-resizable")) {
    ctx.mark(node);
    return <ResizableFixture key={index} node={node} ctx={ctx} />;
  }
  if (node.matches(".v-otp")) {
    const inputs = elementChildren(node).filter((child) =>
      child.matches("input"),
    );
    const value = inputs
      .map((input) => input.getAttribute("value") ?? "")
      .join("");
    ctx.mark(node);
    return (
      <InputOtpParts.InputOTP
        key={index}
        maxLength={inputs.length}
        defaultValue={value}
        aria-label={node.getAttribute("aria-label") ?? "One-time code"}
      >
        {render(
          InputOtpParts.InputOTPGroup,
          node,
          ctx,
          {},
          inputs.map((input, i) => (
            <InputOtpParts.InputOTPSlot
              key={i}
              index={i}
              aria-label={input.getAttribute("aria-label") ?? undefined}
            />
          )),
        )}
      </InputOtpParts.InputOTP>
    );
  }
  if (node.matches(".v-cal"))
    return render(
      CalendarParts.Calendar,
      node,
      ctx,
      calendarProps(node, ctx),
      undefined,
      index,
    );
  if (node.hasAttribute("data-datepicker")) {
    ctx.mark(node);
    return <DateFixture key={index} node={node} ctx={ctx} />;
  }
  if (node.hasAttribute("data-select")) {
    ctx.mark(node);
    return <SelectFixture key={index} node={node} ctx={ctx} />;
  }
  if (node.matches(".v-combo")) {
    const wrapper = node.querySelector(":scope > .v-input")!;
    const input = wrapper.querySelector("input")!;
    const menu = node.querySelector(":scope > .v-menu")!;
    const leading = elementChildren(wrapper)
      .filter((child) => child !== input)
      .map((child, i) => ctx.convert(child, i));
    return render(
      ComboboxParts.Combobox,
      node,
      ctx,
      { defaultOpen: false },
      <>
        {render(
          ComboboxParts.ComboboxInput,
          input,
          ctx,
          { wrapperProps: ctx.props(wrapper), leading },
          undefined,
        )}
        {render(
          ComboboxParts.ComboboxContent,
          menu,
          ctx,
          controlledProps(menu, ctx),
          elementChildren(menu).map((item, i) =>
            render(
              ComboboxParts.ComboboxItem,
              item,
              ctx,
              { value: textValue(item), label: textValue(item) },
              ctx.children(item),
              i,
            ),
          ),
        )}
      </>,
      index,
    );
  }
  if (node.matches(".v-cmd")) {
    const wrapper = node.querySelector(":scope > .v-cmd__input")!;
    const input = wrapper.querySelector("input")!;
    const list = node.querySelector(":scope > .v-cmd__list")!;
    const groups: React.ReactNode[] = [];
    let heading: Element | undefined,
      items: React.ReactNode[] = [];
    const flush = () => {
      if (!heading && !items.length) return;
      groups.push(
        <CommandParts.CommandGroup
          key={groups.length}
          heading={heading ? ctx.children(heading) : undefined}
        >
          {items}
        </CommandParts.CommandGroup>,
      );
      heading = undefined;
      items = [];
    };
    for (const item of elementChildren(list)) {
      if (item.matches(".v-menu__group")) {
        flush();
        heading = item;
        continue;
      }
      if (item.matches(".v-cmd__empty")) {
        flush();
        groups.push(
          render(
            CommandParts.CommandEmpty,
            item,
            ctx,
            clear(ctx.props(item), "hidden"),
            ctx.children(item),
            groups.length,
          ),
        );
        continue;
      }
      items.push(
        render(
          CommandParts.CommandItem,
          item,
          ctx,
          { value: textValue(item) },
          ctx.children(item),
          items.length,
        ),
      );
    }
    flush();
    const siblings = elementChildren(wrapper);
    const inputIndex = siblings.indexOf(input);
    return render(
      CommandParts.Command,
      node,
      ctx,
      {},
      <>
        {render(
          CommandParts.CommandInput,
          input,
          ctx,
          {
            leading: siblings
              .slice(0, inputIndex)
              .map((child, i) => ctx.convert(child, i)),
            trailing: siblings
              .slice(inputIndex + 1)
              .map((child, i) => ctx.convert(child, i)),
          },
          undefined,
        )}
        {render(CommandParts.CommandList, list, ctx, {}, groups)}
      </>,
      index,
    );
  }
  if (node.matches(".v-menubar")) {
    const hosts = elementChildren(node);
    return render(
      MenubarParts.Menubar,
      node,
      ctx,
      { defaultValue: "" },
      hosts.map((host, i) => {
        const trigger = host.querySelector(".v-menubar__trigger")!;
        const content = host.querySelector(".v-menu")!;
        return (
          <MenubarParts.MenubarMenu key={i} value={String(i)}>
            {native(
              host,
              ctx,
              <>
                {render(
                  MenubarParts.MenubarTrigger,
                  trigger,
                  ctx,
                  controlledProps(trigger, ctx),
                )}
                {render(
                  MenubarParts.MenubarContent,
                  content,
                  ctx,
                  controlledProps(content, ctx),
                  menuItems(
                    content,
                    ctx,
                    "Menubar",
                    MenubarParts as unknown as Parts,
                  ),
                )}
              </>,
            )}
          </MenubarParts.MenubarMenu>
        );
      }),
      index,
    );
  }
  if (node.matches(".v-nav") && !node.closest(".v-sidebar")) {
    const items = elementChildren(node);
    return render(
      NavigationMenuParts.NavigationMenu,
      node,
      ctx,
      {},
      <NavigationMenuParts.NavigationMenuList>
        {items.map((item, i) =>
          item.matches(".v-nav__group") ? (
            <NavigationMenuParts.NavigationMenuItem key={i}>
              {render(NavigationMenuParts.NavigationMenuGroup, item, ctx)}
            </NavigationMenuParts.NavigationMenuItem>
          ) : (
            <NavigationMenuParts.NavigationMenuItem key={i}>
              {render(
                NavigationMenuParts.NavigationMenuLink,
                item,
                ctx,
                { active: item.getAttribute("aria-current") === "page" },
                ctx.children(item),
              )}
            </NavigationMenuParts.NavigationMenuItem>
          ),
        )}
      </NavigationMenuParts.NavigationMenuList>,
      index,
    );
  }
  if (node.matches(".v-nav__label") && !node.closest(".v-sidebar"))
    return render(
      NavigationMenuParts.NavigationMenuLabel,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (node.matches(".v-nav__count") && !node.closest(".v-sidebar"))
    return render(
      NavigationMenuParts.NavigationMenuCount,
      node,
      ctx,
      {},
      ctx.children(node),
      index,
    );
  if (
    elementChildren(node).some((child) => child.hasAttribute("data-context")) &&
    elementChildren(node).some((child) => child.matches(".v-menu"))
  ) {
    ctx.mark(node);
    return <MenuFixture key={index} node={node} ctx={ctx} kind="ContextMenu" />;
  }
  if (
    elementChildren(node).some((child) => child.hasAttribute("data-menu")) &&
    elementChildren(node).some((child) => child.matches(".v-menu"))
  ) {
    const menu = elementChildren(node).find((child) =>
      child.matches(".v-menu"),
    )!;
    ctx.mark(node);
    return (
      <MenuFixture
        key={index}
        node={node}
        ctx={ctx}
        kind={menu.matches(".v-popover") ? "Popover" : "DropdownMenu"}
      />
    );
  }
  if (node.hasAttribute("data-hovercard")) {
    const target = ctx.fixture.querySelector(
      node.getAttribute("data-hovercard")!,
    );
    const content = target?.querySelector(".v-popover");
    if (!content) return undefined;
    ctx.mark(node);
    return (
      <HoverCardParts.HoverCard key={index}>
        <HoverCardParts.HoverCardTrigger asChild>
          {ctx.convert(node, index, { skipInteractive: true })}
        </HoverCardParts.HoverCardTrigger>
        {render(
          HoverCardParts.HoverCardContent,
          content,
          ctx,
          controlledProps(content, ctx),
        )}
      </HoverCardParts.HoverCard>
    );
  }
  if (node.matches(".v-hovercard"))
    return React.createElement(node.tagName.toLowerCase(), { ...ctx.props(node), hidden: !node.classList.contains("-show"), key: index });
  if (node.hasAttribute("data-tooltip")) {
    ctx.mark(node);
    return (
      <TooltipParts.TooltipProvider key={index}>
        <TooltipParts.Tooltip>
          <TooltipParts.TooltipTrigger asChild>
            {ctx.convert(node, index, { skipInteractive: true })}
          </TooltipParts.TooltipTrigger>
          <TooltipParts.TooltipContent>
            {node.getAttribute("data-tooltip")}
          </TooltipParts.TooltipContent>
        </TooltipParts.Tooltip>
      </TooltipParts.TooltipProvider>
    );
  }
  if (node.hasAttribute("data-toast")) {
    ctx.mark(node);
    return <ToastFixture key={index} node={node} ctx={ctx} />;
  }
  return undefined;
}
