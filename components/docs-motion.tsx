"use client";

import Link from "next/link";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { MotionControls } from "@/registry/cojeev/ui/adjuster";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/registry/cojeev/ui/sheet";

export function DocsMotion({ className, iconOnly = false, label = "Motion settings" }: { className?: string; iconOnly?: boolean; label?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="secondary" className={className} aria-label="Motion settings" title={iconOnly ? "Motion settings" : undefined}><AnimatedIcon name="settings"/>{!iconOnly && label}</Button>
      </SheetTrigger>
      <SheetContent className="docs-motion-panel">
        <SheetHeader>
          <div className="docs-motion-heading">
            <SheetTitle>Make it feel right</SheetTitle>
            <SheetDescription>Nine characters. One shared motion system.</SheetDescription>
          </div>
          <SheetClose asChild><Button size="sm" variant="ghost" aria-label="Close motion settings"><AnimatedIcon name="x" size="sm" aria-hidden="true" />Close</Button></SheetClose>
        </SheetHeader>
        <MotionControls />
        <SheetClose asChild>
          <Link className="docs-advanced-link" href="/docs/adjuster/">Explore body shapes and advanced tuning →</Link>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
