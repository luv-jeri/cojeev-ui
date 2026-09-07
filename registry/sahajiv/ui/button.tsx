"use client"

import * as React from "react"
import { Spinner } from "@/registry/sahajiv/ui/spinner"
import { useFlowPress } from "@/registry/sahajiv/motion/flow-press"
import { useMorph } from "@/registry/sahajiv/motion/use-morph"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/registry/sahajiv/lib/utils"

const buttonVariants = cva(
  "v-btn inline-flex items-center justify-center gap-[var(--s-2)] h-[var(--ctl-md)] px-[var(--s-5)] py-0 rounded-[var(--r-pill)] text-[length:var(--fs-control)] font-[number:var(--fw-control)] leading-none whitespace-nowrap bg-[var(--primary)] text-[color:var(--primary-foreground)] motion-safe:active:[transform:translateY(1px)]",
  {
    variants: {
      variant: {
        default: "",
        accent: "-accent bg-[var(--v-pink)] text-[color:var(--v-on-accent)] hover:bg-[var(--v-pink-deep)]",
        secondary: "-secondary bg-[var(--v-beige)] text-[color:var(--v-text)] [box-shadow:inset_0_0_0_1px_var(--v-text-2)] hover:[box-shadow:inset_0_0_0_1px_var(--v-text)]",
        ghost: "-ghost bg-transparent text-[color:var(--v-text)] hover:bg-[var(--v-beige)]",
        outline: "-outline bg-transparent text-[color:var(--v-text)] [box-shadow:inset_0_0_0_1px_var(--v-border)] hover:bg-[var(--v-beige-2)]",
        danger: "-danger bg-[var(--v-danger-fill)] text-[color:var(--destructive-foreground)]",
        block: "-block w-full",
      },
      size: {
        default: "",
        sm: "-sm h-[var(--ctl-sm)] px-[var(--s-4)] text-[13px]",
        lg: "-lg h-[var(--ctl-lg)] px-[var(--s-6)] text-[length:var(--fs-body)]",
      },
      fullWidth: { true: "-block w-full", false: "" },
    },
    defaultVariants: { variant: "default", size: "default", fullWidth: false },
  },
)

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  loading?: boolean
  loadingIndicator?: React.ReactNode
}

function Button({ ref: externalRef, className, variant, size, fullWidth, loading, loadingIndicator, children, type = "button", "aria-busy": ariaBusy, ...props }: ButtonProps) {
  const morphRef = useMorph<HTMLButtonElement>("buttons", externalRef)
  const pressRef = useFlowPress(morphRef)
  const busy = loading ?? (ariaBusy === true || ariaBusy === "true")
  return (
    <button ref={pressRef} data-slot="button" data-part="root" data-state={props.disabled ? "disabled" : busy ? "busy" : "rest"} type={type} aria-busy={busy || undefined} className={cn(buttonVariants({ variant, size, fullWidth }), "leading-none", className)} {...props}>
      {busy && (loadingIndicator ?? <ButtonIndicator />)}
      {children}
    </button>
  )
}

function ButtonIndicator({className,...props}:React.ComponentProps<"span">) {
  return <Spinner data-slot="button-indicator" data-part="indicator" data-label="" aria-hidden="true" className={className} {...props}/>
}

export { Button, ButtonIndicator, buttonVariants }
export type { ButtonProps }
