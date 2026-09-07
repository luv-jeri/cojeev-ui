"use client"
import * as React from "react"
import { DirectionProvider } from "@radix-ui/react-direction"
export type DirectionProps=React.ComponentProps<"div"> & { dir?:"ltr"|"rtl" }
export function Direction({dir="rtl",children,...props}:DirectionProps){return <DirectionProvider dir={dir}><div data-slot="direction" dir={dir} {...props}>{children}</div></DirectionProvider>}
export { DirectionProvider }
