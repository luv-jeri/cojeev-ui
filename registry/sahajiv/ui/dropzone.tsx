"use client";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
export const dropzoneVariants = cva(
  "v-drop grid justify-items-center gap-[8px] px-[24px] py-[28px] rounded-[22px] bg-[var(--v-canvas)] border-[1.5px] border-dashed border-[var(--v-edge)] text-center cursor-pointer",
);
export type DropzoneFile = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};
export type DropzoneProps = React.ComponentProps<"div"> & {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  showReceipt?: boolean;
};
export function Dropzone({
  className,
  children,
  onFilesSelected,
  accept,
  multiple = true,
  disabled,
  showReceipt = true,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onKeyDown,
  ...props
}: DropzoneProps) {
  const picker = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);
  const [over, setOver] = React.useState(false);
  const [receipt, setReceipt] = React.useState("");
  const receive = (files: File[]) => {
    const chosen = multiple ? files : files.slice(0, 1);
    onFilesSelected?.(chosen);
    setReceipt(
      chosen.length
        ? `${chosen.length} file${chosen.length === 1 ? "" : "s"} selected: ${chosen.map((f) => f.name).join(", ")}.`
        : "No files selected.",
    );
  };
  return (
    <div
      data-slot="dropzone"
      data-part="root"
      data-drop=""
      data-state={over ? "over" : "rest"}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label="Add files"
      className={cn(dropzoneVariants(), over && "-over", className)}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !disabled &&
          event.target !== picker.current
        )
          picker.current?.click();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          !event.defaultPrevented &&
          !disabled &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          picker.current?.click();
        }
      }}
      onDragEnter={(event) => {
        onDragEnter?.(event);
        event.preventDefault();
        if (!disabled && ++depth.current > 0) setOver(true);
      }}
      onDragOver={(event) => {
        onDragOver?.(event);
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        onDragLeave?.(event);
        event.preventDefault();
        if (--depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      }}
      onDrop={(event) => {
        onDrop?.(event);
        event.preventDefault();
        depth.current = 0;
        setOver(false);
        if (!disabled) receive(Array.from(event.dataTransfer.files));
      }}
      {...props}
    >
      <input
        ref={picker}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
        onChange={(event) => {
          receive(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {children ?? (
        <>
          <b className="text-[16px]">Drop files here</b>
          <span className="v-quiet text-[13px]">
            or press Enter to choose files
          </span>
        </>
      )}
      {showReceipt && receipt && (
        <p
          data-slot="dropzone-receipt"
          data-drop-result=""
          role="status"
          className="v-quiet text-[12.5px]"
        >
          {receipt}
        </p>
      )}
    </div>
  );
}
