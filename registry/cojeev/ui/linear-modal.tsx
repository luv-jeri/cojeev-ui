"use client";
/**
 * Card-to-detail shared layout, adapted from UI Layout Linear Modal.
 * Source: https://github.com/ui-layouts/uilayouts/tree/88d827d7ec342917ca06f6894e5add65fabbe5d8/apps/ui-layout/components/ui/linear-modal.tsx
 * MIT License — Copyright (c) 2024 UI LAYOUT
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Button } from "./button";
import { Icon } from "./icon";
import { ScrollArea } from "./scroll-area";
import {
  Dialog,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
import { cn } from "../lib/utils";
import { useChoreography } from "../motion/choreography";
export type LinearModalProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: string;
  description: string;
  src: string;
  alt: string;
  eyebrow?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "card" | "compact" | "centered";
};
/** Radix owns native modal semantics. Motion alone owns the shared surface journey. */
export function LinearModal({
  title,
  description,
  src,
  alt,
  eyebrow,
  open,
  defaultOpen = false,
  onOpenChange,
  variant = "card",
  children,
  className,
  ref,
  ...props
}: LinearModalProps) {
  const [localOpen, setLocalOpen] = React.useState(defaultOpen),
    id = React.useId();
  const { quiet, transition } = useChoreography();
  const isOpen = open ?? localOpen;
  const change = (value: boolean) => {
    if (open === undefined) setLocalOpen(value);
    onOpenChange?.(value);
  };
  // A single layout group and stable IDs connect the measured card and portal.
  // Quiet mode removes projection, while content and native semantics remain.
  const shared = (part: string) => (quiet ? undefined : `${id}-${part}`);
  const timing = quiet ? { duration: 0, delay: 0 } : transition;
  return (
    <div
      {...props}
      ref={ref}
      className={cn("v-linear-modal", className)}
      data-slot="linear-modal"
      data-variant={variant}
      data-quiet={quiet || undefined}
    >
      <LayoutGroup id={id}>
        <Dialog open={isOpen} onOpenChange={change}>
          <DialogTrigger asChild>
            <motion.button
              type="button"
              layoutId={shared("surface")}
              className="v-linear-modal__card"
              data-morph="none"
              data-flow="off"
              transition={timing}
              style={{ borderRadius: 24, opacity: isOpen ? 0 : 1 }}
              aria-label={`Read ${title}`}
            >
              <motion.img
                layoutId={shared("image")}
                transition={timing}
                className="v-linear-modal__image"
                src={src}
                alt={alt}
              />
              <span className="v-linear-modal__summary">
                {eyebrow && (
                  <span className="v-linear-modal__edition">{eyebrow}</span>
                )}
                <motion.strong layoutId={shared("title")} transition={timing}>
                  {title}
                </motion.strong>
                <span>{description}</span>
                <span className="v-linear-modal__read" aria-hidden="true">
                  Take a closer look <Icon name="plus" />
                </span>
              </span>
            </motion.button>
          </DialogTrigger>
          <AnimatePresence>
            {isOpen && (
              <Primitive.Portal forceMount>
                <Primitive.Overlay asChild forceMount>
                  <motion.div
                    className="v-linear-modal__overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={quiet ? { duration: 0 } : { duration: 0.2 }}
                  />
                </Primitive.Overlay>
                <Primitive.Content asChild forceMount>
                  <motion.section
                    className="v-linear-modal__detail"
                    data-variant={variant}
                    data-morph="none"
                    data-flow="off"
                    layoutId={shared("surface")}
                    transition={timing}
                    style={{ borderRadius: 28 }}
                    aria-describedby={`${id}-description`}
                  >
                    <ScrollArea
                      variant="plain"
                      type="always"
                      className="v-linear-modal__scroll"
                      aria-label="Study detail"
                      viewportProps={{ tabIndex: -1 }}
                    >
                      <motion.img
                        layoutId={shared("image")}
                        transition={timing}
                        className="v-linear-modal__hero"
                        src={src}
                        alt={alt}
                      />
                      <div className="v-linear-modal__content">
                        <DialogTitle asChild>
                          <motion.h2
                            layoutId={shared("title")}
                            transition={timing}
                          >
                            {title}
                          </motion.h2>
                        </DialogTitle>
                        <motion.div
                          initial={quiet ? false : { opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: quiet ? 0 : 8 }}
                          transition={
                            quiet
                              ? { duration: 0 }
                              : { duration: 0.25, delay: 0.1 }
                          }
                        >
                          <DialogDescription id={`${id}-description`}>
                            {description}
                          </DialogDescription>
                          <div className="v-linear-modal__story">
                            {children}
                          </div>
                        </motion.div>
                      </div>
                    </ScrollArea>
                    <DialogClose asChild>
                      <Button
                        className="v-linear-modal__close"
                        variant="secondary"
                        aria-label="Close detail"
                      >
                        <Icon name="x" />
                      </Button>
                    </DialogClose>
                  </motion.section>
                </Primitive.Content>
              </Primitive.Portal>
            )}
          </AnimatePresence>
        </Dialog>
      </LayoutGroup>
    </div>
  );
}
