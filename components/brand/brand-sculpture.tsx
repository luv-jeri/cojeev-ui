"use client";

import * as React from "react";
import Image from "next/image";
import sculpture from "@/public/brand/000h-sculpture.webp";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { BrandMark } from "./brand-mark";

/** A dimensional counterpart to the flat identity, carried by the shared scroll plane. */
export function BrandSculpture() {
  const [unavailable, setUnavailable] = React.useState(false);
  return (
    <div className="brand-sculpture" data-brand-sculpture="" aria-hidden="true">
      <span className="brand-sculpture__shadow" />
      <FloatLayer
        depth={-24}
        drift={0}
        revealDistance={18}
        revealDuration={0.9}
        className="brand-sculpture__object"
      >
        {unavailable ? (
          <BrandMark className="brand-sculpture__fallback" />
        ) : (
          <Image
            src={sculpture}
            width={640}
            height={640}
            sizes="(max-width: 620px) 88px, 128px"
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setUnavailable(true)}
          />
        )}
      </FloatLayer>
    </div>
  );
}
