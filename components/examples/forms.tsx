"use client";

import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { Checkbox } from "@/registry/cojeev/ui/checkbox";
import { MultiSelect } from "@/registry/cojeev/ui/multi-select";
import { BodySecondary } from "@/registry/cojeev/ui/typography";

export function MultiSelectExample() {
  const [selected, setSelected] = React.useState<string[]>(["design", "engineering"]);
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const filterId = React.useId();
  const options = [
    { value: "design", label: "Design" },
    { value: "engineering", label: "Engineering" },
    { value: "research", label: "Research" },
    { value: "writing", label: "Writing" },
    { value: "data", label: "Data analysis" },
    { value: "operations", label: "Operations" },
    { value: "legal", label: "Legal review · unavailable", disabled: true },
  ];
  const filteredOptions = availableOnly ? options.filter(option => !option.disabled) : options;
  return <div style={{ display: "grid", gap: 16, width: "100%", maxWidth: 480 }}>
    <MultiSelect label="Topics" name="topics" options={filteredOptions} value={selected} onValueChange={setSelected} description="Search and choose the topics you want to follow." error={!selected.length ? "Choose at least one topic to continue." : undefined} />
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Checkbox id={filterId} checked={availableOnly} onCheckedChange={value => setAvailableOnly(value === true)} />
      <label htmlFor={filterId}>Show only available topics</label>
    </div>
    <BodySecondary role="status">{selected.length ? `Following: ${selected.map(value => options.find(option => option.value === value)?.label ?? value).join(", ")}.` : "No topics selected."}</BodySecondary>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Button size="sm" variant="secondary" onClick={() => { setSelected(["design", "engineering"]); setAvailableOnly(false); }}>Reset selection</Button>
      <Button size="sm" variant="ghost" disabled={!selected.length} onClick={() => setSelected([])}>Clear selection</Button>
    </div>
  </div>;
}
