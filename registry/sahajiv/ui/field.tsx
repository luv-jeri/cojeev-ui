"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import { Label, type LabelProps } from "@/registry/sahajiv/ui/label";
const FieldContext = React.createContext<{
  id: string;
  invalid: boolean;
} | null>(null);
const fieldVariants = cva(
  "v-field grid gap-[8px] [border:0] bg-transparent [box-shadow:none]",
  {
    variants: { variant: { default: "", invalid: "-invalid" } },
    defaultVariants: { variant: "default" },
  },
);
export type FieldProps = React.ComponentProps<"div"> &
  VariantProps<typeof fieldVariants> & {
    invalid?: boolean;
    controlId?: string;
  };
export function Field({
  className,
  variant,
  invalid = variant === "invalid",
  controlId,
  children,
  ...props
}: FieldProps) {
  const generatedId = React.useId();
  return (
    <FieldContext.Provider value={{ id: controlId ?? generatedId, invalid }}>
      <div
        data-slot="field"
        data-part="root"
        data-state={invalid ? "error" : "rest"}
        className={cn(
          fieldVariants({ variant: invalid ? "invalid" : variant }),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}
export type FieldLabelProps = LabelProps;
export function FieldLabel(props: FieldLabelProps) {
  const field = React.useContext(FieldContext);
  return (
    <Label
      data-slot="field-label"
      data-part="label"
      htmlFor={field?.id}
      {...props}
    />
  );
}
export type FieldControlProps = React.ComponentProps<typeof Slot>;
export function FieldControl({ children, ...props }: FieldControlProps) {
  const field = React.useContext(FieldContext);
  return (
    <Slot
      data-part="input"
      id={field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field ? `${field.id}-message` : undefined}
      {...props}
    >
      {children}
    </Slot>
  );
}
export type FieldDescriptionProps = React.ComponentProps<"p">;
export function FieldDescription({
  className,
  ...props
}: FieldDescriptionProps) {
  const field = React.useContext(FieldContext);
  return (
    <p
      data-slot="field-description"
      data-part="message"
      id={field ? `${field.id}-message` : undefined}
      className={cn(
        "v-help min-h-[1.3em] text-[length:var(--fs-meta)] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    />
  );
}
export type FieldErrorProps = FieldDescriptionProps & {
  errors?: Array<{ message?: string } | undefined>;
};
export function FieldError({ errors, children, ...props }: FieldErrorProps) {
  return (
    <FieldDescription role="alert" {...props}>
      {children ??
        [
          ...new Set(errors?.map((error) => error?.message).filter(Boolean)),
        ].join(" ")}
    </FieldDescription>
  );
}
export type FieldSetProps = React.ComponentProps<"fieldset">;
export function FieldSet({ className, ...props }: FieldSetProps) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("grid min-w-0 gap-[var(--s-5)] [border:0] p-0", className)}
      {...props}
    />
  );
}
export type FieldLegendProps = React.ComponentProps<"legend">;
export function FieldLegend({ className, ...props }: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        "v-label text-[length:var(--fs-lead)] font-semibold",
        className,
      )}
      {...props}
    />
  );
}
export type FieldGroupProps = React.ComponentProps<"div">;
export function FieldGroup({ className, ...props }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      className={cn("grid gap-[var(--s-5)]", className)}
      {...props}
    />
  );
}
export { fieldVariants };
