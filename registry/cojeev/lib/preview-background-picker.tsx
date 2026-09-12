"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { PreviewBackgroundThumbnail, previewBackgroundGroups, type PreviewBackgroundVariant } from "./preview-backgrounds";

/** One visual choice, outside document flow; selecting paint never remounts content. */
export function PreviewBackgroundPicker({ value, onChange, disabled = false }: {
  value: PreviewBackgroundVariant;
  onChange: (value: PreviewBackgroundVariant) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const choiceButton = (choice: { value: PreviewBackgroundVariant; label: string; description: string }) => <Button key={choice.value} shape="card" variant="ghost" className="v-preview-background-picker__choice" aria-label={choice.label} aria-pressed={value === choice.value} title={choice.description}
    onClick={() => { onChange(choice.value); setOpen(false); }}>
    <span className="v-preview-background-picker__swatch" aria-hidden="true">
      {choice.value === "none" ? <Icon name="ban" size="sm" /> : <PreviewBackgroundThumbnail value={choice.value} />}
    </span>
    <span className="v-preview-background-picker__label">{choice.label}<span className="v-preview-background-picker__check" aria-hidden="true">{value === choice.value && <Icon name="check" size="sm" />}</span></span>
  </Button>;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button size="sm" variant="ghost" disabled={disabled} title={disabled ? "Background is fixed here, or switch to Preview to change it." : "Choose a preview background"}>
        <Icon name="paintbrush" size="sm" aria-hidden="true" />Background
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" collisionPadding={12} className="v-preview-background-picker" aria-label="Choose preview background">
      <div className="v-preview-background-picker__heading">
        <strong>Preview backgrounds</strong>
        <span>Change the canvas. Keep your example.</span>
      </div>
      <div className="v-preview-background-picker__plain">{choiceButton({ value: "none", label: "Plain", description: "No decorative background." })}</div>
      {previewBackgroundGroups.map(group => <div key={group.label} className="v-preview-background-picker__group" role="group" aria-label={group.label}>
        <strong className="v-preview-background-picker__group-label">{group.label}</strong>
        <div className="v-preview-background-picker__choices">{group.choices.map(choiceButton)}</div>
      </div>)}
    </PopoverContent>
  </Popover>;
}
