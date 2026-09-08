"use client";

import Link from "next/link";
import { Button } from "@/registry/sahajiv/ui/button";
import { AnimatedIcon } from "@/registry/sahajiv/ui/animated-icon";
import { MotionControls } from "@/registry/sahajiv/ui/adjuster";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/registry/sahajiv/ui/sheet";

export function DocsMotion({ className }: { className?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="secondary" className={className}><AnimatedIcon name="settings"/>Motion settings</Button>
      </SheetTrigger>
      <SheetContent className="docs-motion-panel">
        <SheetHeader>
          <div className="docs-motion-heading">
            <SheetTitle>Make it feel right</SheetTitle>
            <SheetDescription>Nine characters. One shared motion system.</SheetDescription>
          </div>
          <SheetClose asChild><Button size="sm" variant="ghost" aria-label="Close motion settings">Close</Button></SheetClose>
        </SheetHeader>
        <MotionControls />
        <SheetClose asChild>
          <Link className="docs-advanced-link" href="/docs/adjuster/">Explore body shapes and advanced tuning →</Link>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
