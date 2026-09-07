"use client";

import * as React from "react";
import { useMorph } from "@/registry/sahajiv/motion/use-morph";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp";
export const inputOTPVariants = cva("v-otp flex gap-[var(--s-2)]");
export type InputOTPProps = React.ComponentProps<typeof OTPInput>;
export function InputOTP({
  containerClassName,
  className,
  pattern = REGEXP_ONLY_DIGITS,
  ...props
}: InputOTPProps) {
  return (
    <OTPInput
      data-slot="input-otp"
      data-part="root"
      data-otp=""
      containerClassName={cn(inputOTPVariants(), containerClassName)}
      className={className}
      pattern={pattern}
      {...props}
    />
  );
}
export type InputOTPGroupProps = React.ComponentProps<"div">;
export function InputOTPGroup({
  className,
  ref,
  ...props
}: InputOTPGroupProps) {
  const morphRef = useMorph<HTMLDivElement>("inputs", ref);
  return (
    <div
      ref={morphRef}
      data-slot="input-otp-group"
      className={cn("v-otp flex gap-[var(--s-2)]", className)}
      {...props}
    />
  );
}
export type InputOTPSlotProps = React.ComponentProps<"div"> & { index: number };
export function InputOTPSlot({
  className,
  index,
  ...props
}: InputOTPSlotProps) {
  const context = React.useContext(OTPInputContext);
  const slot = context.slots[index];
  return (
    <div
      data-slot="input-otp-slot"
      data-part="item"
      data-active={slot?.isActive || undefined}
      className={cn("grid place-items-center relative", className)}
      {...props}
    >
      {slot?.char}
      {slot?.hasFakeCaret && (
        <span aria-hidden="true" className="absolute h-5 w-px bg-current" />
      )}
    </div>
  );
}
export type InputOTPSeparatorProps = React.ComponentProps<"div">;
export function InputOTPSeparator({
  children,
  ...props
}: InputOTPSeparatorProps) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      {children ?? "−"}
    </div>
  );
}
