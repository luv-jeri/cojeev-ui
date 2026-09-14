import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../registry/cojeev/ui/accordion";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../registry/cojeev/ui/collapsible";

test("disclosure asChild keeps exactly one caller-owned native trigger", () => {
  for (const view of [
    <Accordion key="accordion" type="single" defaultValue="one">
      <AccordionItem value="one">
        <AccordionTrigger asChild>
          <button type="button">Caller summary</button>
        </AccordionTrigger>
        <AccordionContent>Detail</AccordionContent>
      </AccordionItem>
    </Accordion>,
    <Collapsible key="collapsible" defaultOpen>
      <CollapsibleTrigger asChild>
        <button type="button">Caller summary</button>
      </CollapsibleTrigger>
      <CollapsibleContent>Detail</CollapsibleContent>
    </Collapsible>,
  ]) {
    const html = renderToStaticMarkup(view);
    assert.equal((html.match(/<button\b/g) ?? []).length, 1);
    assert.match(html, /aria-expanded="true"/);
    assert.match(html, /Caller summary/);
  }
});

test("standard disclosure triggers include one directional indicator", () => {
  const accordion = renderToStaticMarkup(
    <Accordion type="single">
      <AccordionItem value="one">
        <AccordionTrigger>Summary</AccordionTrigger>
        <AccordionContent>Detail</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );
  const collapsible = renderToStaticMarkup(
    <Collapsible>
      <CollapsibleTrigger>Summary</CollapsibleTrigger>
      <CollapsibleContent>Detail</CollapsibleContent>
    </Collapsible>,
  );
  assert.equal(
    (accordion.match(/data-slot="accordion-indicator"/g) ?? []).length,
    1,
  );
  assert.equal(
    (collapsible.match(/data-slot="collapsible-indicator"/g) ?? []).length,
    1,
  );
});
