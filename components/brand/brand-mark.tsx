import type { ComponentProps } from "react";
import { brandPath, brandViewBox } from "@/lib/brand";

/** The primary 2D mark. It inherits ink and has three genuine transparent counters. */
export function BrandMark({ className = "", ...props }: ComponentProps<"svg">) {
  return (
    <svg
      viewBox={brandViewBox}
      width="32"
      height="32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-brand-mark=""
      className={className}
      {...props}
    >
      <path d={brandPath} fillRule="evenodd" />
    </svg>
  );
}
