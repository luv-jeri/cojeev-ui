"use client";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Button, type ButtonProps } from "@/registry/sahajiv/ui/button";
import {
  InputControl,
  type InputControlProps,
} from "@/registry/sahajiv/ui/input";
import { Textarea, type TextareaProps } from "@/registry/sahajiv/ui/textarea";
export const inputGroupVariants = cva(
  "v-igroup flex items-center h-[52px] gap-[10px] py-0 pl-[18px] pr-[6px] rounded-[var(--r-pill)] border-0 bg-[var(--input)] [box-shadow:inset_0_0_0_1px_var(--v-edge)]",
);
export type InputGroupProps = React.ComponentProps<"div">;
export function InputGroup({ className, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      data-part="root"
      className={cn(inputGroupVariants(), className)}
      {...props}
    />
  );
}
export type InputGroupAddonProps = React.ComponentProps<"div">;
export function InputGroupAddon({ className, ...props }: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-part="addon"
      className={cn(
        "v-addon shrink-0 whitespace-nowrap text-[13px] font-medium text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    />
  );
}
export type InputGroupInputProps = InputControlProps;
export function InputGroupInput({ className, ...props }: InputGroupInputProps) {
  return (
    <InputControl
      data-slot="input-group-input"
      className={cn(
        "text-[length:var(--fs-body)] text-[color:var(--v-text)]",
        className,
      )}
      {...props}
    />
  );
}
export type InputGroupTextareaProps = TextareaProps;
export function InputGroupTextarea(props: InputGroupTextareaProps) {
  return <Textarea data-slot="input-group-textarea" {...props} />;
}
export type InputGroupButtonProps = ButtonProps;
export function InputGroupButton({
  className,
  ...props
}: InputGroupButtonProps) {
  return (
    <Button
      data-slot="input-group-button"
      className={cn("h-[40px] px-[16px] shrink-0", className)}
      {...props}
    />
  );
}
export type InputGroupTextProps = React.ComponentProps<"span">;
export function InputGroupText({ className, ...props }: InputGroupTextProps) {
  return (
    <span
      data-slot="input-group-text"
      className={cn("text-[13px] text-[color:var(--v-text-2)]", className)}
      {...props}
    />
  );
}
export type InputSearchProps = React.ComponentProps<"div">;
export function InputSearch({ className, ...props }: InputSearchProps) {
  return (
    <div
      data-slot="input-search"
      className={cn("v-search flex items-center gap-[12px]", className)}
      {...props}
    />
  );
}
export type InputSearchScopeProps = React.ComponentProps<"div">;
export function InputSearchScope({
  className,
  ...props
}: InputSearchScopeProps) {
  return (
    <div
      data-slot="input-search-scope"
      className={cn(
        "v-scope flex shrink-0 items-center gap-[6px] text-[12.5px] text-[color:var(--v-text-2)] whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}
