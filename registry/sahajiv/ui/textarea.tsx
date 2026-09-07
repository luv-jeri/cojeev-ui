"use client";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
export const textareaVariants = cva(
  "v-textarea block w-full min-h-[128px] resize-y rounded-[20px] [border:0] bg-[var(--input)] px-[18px] py-[16px] text-[15px] leading-[1.5] text-[color:var(--v-text)] [box-shadow:inset_0_0_0_1px_var(--v-edge)] outline-none placeholder:text-[color:var(--v-text-2)]",
);
export type TextareaProps = React.ComponentProps<"textarea">;
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-part="root"
      className={cn(textareaVariants(), className)}
      {...props}
    />
  );
}
export type TextareaComposerProps = React.ComponentProps<"div">;
export function TextareaComposer({
  className,
  ...props
}: TextareaComposerProps) {
  return (
    <div
      data-slot="textarea-composer"
      data-part="root"
      className={cn(
        "v-composer grid gap-0 rounded-[22px] bg-[var(--input)] [box-shadow:inset_0_0_0_1px_var(--v-edge)]",
        className,
      )}
      {...props}
    />
  );
}
export type TextareaComposerBarProps = React.ComponentProps<"div">;
export function TextareaComposerBar({
  className,
  ...props
}: TextareaComposerBarProps) {
  return (
    <div
      data-slot="textarea-composer-bar"
      data-part="footer"
      className={cn(
        "v-composer__bar flex items-center gap-[8px] pt-[6px] pr-[8px] pb-[8px] pl-[16px]",
        className,
      )}
      {...props}
    />
  );
}
export type TextareaCountProps = React.ComponentProps<"span"> & {
  value: string;
  maxLength?: number;
};
export function TextareaCount({
  value,
  maxLength,
  className,
  ...props
}: TextareaCountProps) {
  return (
    <span
      data-slot="textarea-count"
      className={cn(
        "v-composer__count text-[12px] text-[color:var(--v-text-2)] tabular-nums",
        className,
      )}
      {...props}
    >
      {value.length}
      {maxLength !== undefined && ` / ${maxLength}`}
    </span>
  );
}
