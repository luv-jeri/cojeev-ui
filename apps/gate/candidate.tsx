import React from "react";
import { createRoot } from "react-dom/client";
import { staticComponents, Icon, Shape, Direction } from "./fixture-static";
import { convertComposed } from "./fixture-composed";
import { convertInteractive } from "./fixture-interactive";
import type {
  ConvertOptions,
  FixtureContext,
  FixtureProps,
} from "./fixture-shared";
import { morphClock, rewindMorph } from "@/registry/sahajiv/motion/use-morph";
import "./styles.css";

declare global {
  interface Window {
    __sahajivGate?: {
      rewind: () => void;
      clock: (t: number | null) => void;
      mapped: string[];
    };
  }
}
const mapped = new Set<string>();
window.__sahajivGate = { rewind: rewindMorph, clock: morphClock, mapped: [] };
const payload = JSON.parse(
  document.getElementById("fixture")!.textContent!,
) as { id: string; fixture: string };
const fixture = new DOMParser().parseFromString(payload.fixture, "text/html");
const state =
  fixture.body
    .querySelector("[data-gate]")
    ?.getAttribute("data-gate")
    ?.split("/")[3] ?? "rest";
const attributeNames: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  viewbox: "viewBox",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  colspan: "colSpan",
  rowspan: "rowSpan",
  maxlength: "maxLength",
  minlength: "minLength",
  inputmode: "inputMode",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  readonly: "readOnly",
};
const booleanAttributes = new Set([
  "disabled",
  "hidden",
  "multiple",
  "required",
  "readonly",
  "autofocus",
  "open",
  "checked",
  "selected",
]);
function propsFor(node: Element): FixtureProps {
  const props: FixtureProps = {};
  for (const attribute of Array.from(node.attributes)) {
    if (/^on/i.test(attribute.name)) continue;
    if (attribute.name === "style") {
      const style: Record<string, string> = {};
      const source = (node as HTMLElement).style;
      for (let i = 0; i < source.length; i++) {
        const key = source[i];
        style[
          key.startsWith("--")
            ? key
            : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        ] = source.getPropertyValue(key);
      }
      props.style = style;
    } else if (booleanAttributes.has(attribute.name)) {
      props[attributeNames[attribute.name] ?? attribute.name] = true;
    } else
      props[attributeNames[attribute.name] ?? attribute.name] = attribute.value;
  }
  // Fixture form values are initial state, so real controls remain editable.
  if (node.matches("input,textarea,select") && props.value !== undefined) {
    props.defaultValue = props.value;
    delete props.value;
  }
  if (props.checked !== undefined) {
    props.defaultChecked = props.checked;
    delete props.checked;
  }
  return props;
}
function variantProps(node: Element): FixtureProps {
  const gate = node.getAttribute("data-gate")?.split("/");
  const modifiers = Array.from(node.classList)
    .filter((name) => name.startsWith("-"))
    .map((name) => name.slice(1));
  const first = gate?.[1]?.split("+")[0];
  const variant =
    first && !first.startsWith("v-")
      ? first
      : modifiers.find((value) => !["sm", "lg", "xl"].includes(value));
  const size =
    gate?.[2] ?? modifiers.find((value) => ["sm", "lg", "xl"].includes(value));
  return { ...(variant ? { variant } : {}), ...(size ? { size } : {}) };
}
function mark(node: Element) {
  mapped.add(
    node.getAttribute("data-gate") ?? `${payload.id}:${node.className}`,
  );
}
function convert(
  node: Node,
  index = 0,
  options: ConvertOptions = {},
): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof Element) || node.tagName === "SCRIPT") return null;
  if (!options.Component && !options.skipComposed) {
    const result = convertComposed(node, index, ctx);
    if (result !== undefined) return result;
  }
  if (!options.Component && !options.skipInteractive) {
    const result = convertInteractive(node, index, ctx);
    if (result !== undefined) return result;
  }
  let props: FixtureProps = { ...propsFor(node), key: index };
  let Component: string | React.ElementType =
    options.Component ?? node.tagName.toLowerCase();
  const sourceClasses=Array.from(node.classList).filter(name=>staticComponents[name]);
  // Authored composite classes such as `v-card v-empty` select the more specific
  // public component, which already carries its shared base styling.
  const generic=new Set(["v-card","v-btn","v-disk"]);
  const sourceClass=sourceClasses.find(name=>!generic.has(name))??sourceClasses[0];
  const entry = sourceClass ? staticComponents[sourceClass] : undefined;
  if (options.Component || entry) {
    Component = options.Component ?? entry!.Component;
    props = { ...props, ...variantProps(node) };
    if (!options.Component && entry?.polymorphic)
      props.as = node.tagName.toLowerCase();
    mark(node);
  }
  if (!options.Component && node.matches("[data-icon]")) {
    Component = Icon;
    props.name = node.getAttribute("data-icon");
    mark(node);
  } else if (!options.Component && node.classList.contains("v-shape")) {
    Component = Shape;
    props.as = node.tagName.toLowerCase();
    props.name =
      node.getAttribute("data-shape") ??
      Array.from(node.classList)
        .find((name) => name.startsWith("-") && !["-sm", "-lg"].includes(name))
        ?.slice(1);
    mark(node);
  } else if (
    !options.Component &&
    !entry && payload.id === "direction" &&
    node.hasAttribute("dir")
  ) {
    Component = Direction;
    props.as = node.tagName.toLowerCase();
    mark(node);
  }
  if (sourceClass === "v-track") {
    const value = node.getAttribute("aria-valuenow");
    const percentage =
      (node.querySelector("i") as HTMLElement | null)?.style.getPropertyValue(
        "--p",
      ) ?? (node as HTMLElement).style.getPropertyValue("--p");
    if (value !== null || percentage)
      props.value = Number(value ?? parseFloat(percentage));
  }
  let childNodes = Array.from(node.childNodes);
  if (sourceClass === "v-btn") {
    const indicator = childNodes.find(
      (child) =>
        child instanceof Element && child.classList.contains("v-pulse"),
    );
    if (indicator) {
      props.loadingIndicator = convert(indicator);
      childNodes = childNodes.filter((child) => child !== indicator);
    }
  }
  const children = Object.prototype.hasOwnProperty.call(options, "children")
    ? options.children
    : childNodes.map((child, i) => convert(child, i));
  props = { ...props, ...options.props };
  if (Component === Icon || Component === Shape)
    return React.createElement(Component, props);
  if (
    typeof Component === "string" &&
    [
      "input",
      "img",
      "br",
      "hr",
      "meta",
      "link",
      "source",
      "area",
      "wbr",
    ].includes(Component)
  )
    return React.createElement(Component, props);
  return React.createElement(Component, props, Array.isArray(children) && children.length === 0 ? undefined : children);
}
const ctx: FixtureContext = {
  id: payload.id,
  state,
  fixture,
  props: propsFor,
  convert,
  children: (node) =>
    Array.from(node.childNodes).map((child, i) => convert(child, i)),
  mark,
};
const children = Array.from(fixture.body.childNodes).map((node, i) =>
  convert(node, i),
);
if (!mapped.size)
  throw new Error(`No production component mapped for ${payload.id}`);
window.__sahajivGate.mapped = Array.from(mapped);
document.body.replaceChildren();
createRoot(document.body).render(<>{children}</>);
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    document.documentElement.dataset.ready = "1";
  }),
);
