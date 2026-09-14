"use client";

import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  Shape,
  signatureShapeNames,
  shapeNames,
  type SignatureShapeName,
} from "@/registry/cojeev/ui/shape";
import {
  ShapeArtwork,
  shapeArtworkCode,
  shapeArtworkSvg,
  type ShapeArtworkOptions,
  type ShapeArtworkTone,
  type ShapeArtworkColors,
} from "@/registry/cojeev/ui/shape-artwork";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/registry/cojeev/ui/collapsible";
import { Label } from "@/registry/cojeev/ui/label";
import { Slider } from "@/registry/cojeev/ui/slider";
import { Switch } from "@/registry/cojeev/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/registry/cojeev/ui/select";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";

const shapeLabels: Record<SignatureShapeName, string> = {
  "daisy-12": "Daisy",
  "petal-7": "Petal",
  "aster-9": "Aster",
  "sunburst-24": "Sunburst",
  "clover-soft": "Clover",
  "cloud-3": "Cloud",
  "pebble-soft": "Pebble",
  "pebble-tall": "Tall pebble",
  "ribbon-soft": "Ribbon",
  "scalloped-square": "Scallop",
  cushion: "Cushion",
  "seed-wing": "Seed",
};
const studioTones: ShapeArtworkTone[] = ["pink", "blue", "olive", "yellow"];

function StudioSlider({
  label,
  value,
  onChange,
  min = -180,
  max = 180,
  unit = "°",
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="v-shape-studio__range">
      <div>
        <Label id={id}>{label}</Label>
        <output aria-labelledby={id}>
          {value}
          {unit}
        </output>
      </div>
      <Slider
        aria-labelledby={id}
        thumbLabel={label}
        value={[value]}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

/** One editor shared by the landing page and both shape documentation routes. */
export function ShapeStudio({
  initialFilled = true,
  onChoose,
  onCopyResult,
}: {
  initialFilled?: boolean;
  onChoose?: (name: SignatureShapeName) => void;
  onCopyResult?: (result: "success" | "failure") => void;
}) {
  const [name, setName] = React.useState<SignatureShapeName>("daisy-12"),
    [tone, setTone] = React.useState<ShapeArtworkTone>("pink");
  const [rotation, setRotation] = React.useState(0),
    [filled, setFilled] = React.useState(initialFilled),
    [shadow, setShadow] = React.useState(true),
    [shadowAngle, setShadowAngle] = React.useState(45),
    [echo, setEcho] = React.useState(true),
    [echoAngle, setEchoAngle] = React.useState(-18);
  const [ambient, setAmbient] = React.useState(false),
    [duration, setDuration] = React.useState(10),
    [target, setTarget] = React.useState<SignatureShapeName>("cushion"),
    [receipt, setReceipt] = React.useState("");
  const artwork = React.useRef<SVGSVGElement>(null),
    downloads = React.useRef(new Map<string, ReturnType<typeof setTimeout>>()),
    id = React.useId();
  const morphTo =
    target === name
      ? signatureShapeNames[
          (signatureShapeNames.indexOf(name) + 1) % signatureShapeNames.length
        ]
      : target;
  const options: ShapeArtworkOptions = {
    name,
    tone,
    rotation,
    filled,
    shadow,
    shadowAngle,
    echo,
    echoAngle,
    label: `${shapeLabels[name]} artwork`,
    ambient,
    morphTo,
    morphDuration: duration,
  };
  React.useEffect(() => {
    const pending = downloads.current;
    return () => {
      pending.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      pending.clear();
    };
  }, []);
  function choose(value: SignatureShapeName) {
    setName(value);
    onChoose?.(value);
    setReceipt(`${shapeLabels[value]} selected. Your other settings are kept.`);
  }
  function randomize() {
    const offset =
      1 + Math.floor(Math.random() * (signatureShapeNames.length - 1));
    choose(
      signatureShapeNames[
        (signatureShapeNames.indexOf(name) + offset) %
          signatureShapeNames.length
      ],
    );
  }
  async function copyMask(shape: string) {
    try {
      await navigator.clipboard.writeText(
        `import { Shape } from "@/components/ui/shape";\n\n<Shape name="${shape}" style={{ width: 48, height: 48 }} />`,
      );
      setReceipt(`${shape} React snippet copied.`);
    } catch {
      setReceipt("Could not copy. Select and copy the name beside the shape.");
    }
  }
  function download() {
    let url: string | undefined;
    let link: HTMLAnchorElement | undefined;
    try {
      const colors: Partial<ShapeArtworkColors> = {};
      for (const key of ["fill", "shadow", "echo"] as const) {
        const p = artwork.current?.querySelector(
          `g[data-artwork-layer="${key}"] > path`,
        );
        if (p) {
          const paint = getComputedStyle(p);
          colors[key] = paint.fill === "none" ? paint.stroke : paint.fill;
        }
      }
      url = URL.createObjectURL(
        new Blob([shapeArtworkSvg(options, colors)], {
          type: "image/svg+xml;charset=utf-8",
        }),
      );
      link = document.createElement("a");
      link.href = url;
      link.download = `cojeev-${name}.svg`;
      document.body.append(link);
      link.click();
      const pendingUrl = url;
      downloads.current.set(
        pendingUrl,
        setTimeout(() => {
          URL.revokeObjectURL(pendingUrl);
          downloads.current.delete(pendingUrl);
        }, 1000),
      );
      setReceipt(
        "Still SVG downloaded with your layers and palette colours. React includes the motion.",
      );
    } catch {
      if (url) URL.revokeObjectURL(url);
      setReceipt("The SVG could not be downloaded. Please try again.");
    } finally {
      link?.remove();
    }
  }
  return (
    <section
      data-shape-studio
      className="v-shape-studio"
      aria-labelledby={`${id}-title`}
    >
      <header className="v-shape-studio__heading">
        <p className="v-shape-studio__eyebrow">The shape studio</p>
        <h3 id={`${id}-title`}>
          A little form.
          <br />A lot of character.
        </h3>
        <p>Choose a contour. Give it depth. Let it breathe.</p>
      </header>
      <div className="v-shape-studio__desk">
        <div className="v-shape-studio__proof">
          <span className="v-shape-studio__registration" aria-hidden="true">
            +
          </span>
          <ShapeArtwork
            {...options}
            ref={artwork}
            data-studio-art
            className="v-shape-studio__art"
          />
          <div className="v-shape-studio__caption">
            <span>{shapeLabels[name]}</span>
            <small>{ambient ? "Living contour" : "Still vector"}</small>
          </div>
          <Button
            variant="ghost"
            onClick={randomize}
            aria-label="Randomize silhouette"
          >
            <Icon name="shuffle" />
            Another silhouette
          </Button>
        </div>
        <div className="v-shape-studio__controls">
          <div role="group" aria-label="Artwork colour">
            <p className="v-shape-studio__label">01 / Colour</p>
            <div className="v-shape-studio__tones">
              {studioTones.map((color) => (
                <Button
                  key={color}
                  variant="ghost"
                  aria-label={color[0].toUpperCase() + color.slice(1)}
                  aria-pressed={tone === color}
                  onClick={() => setTone(color)}
                >
                  <span
                    aria-hidden="true"
                    style={{ background: `var(--v-${color})` }}
                  />
                  <small>{color}</small>
                </Button>
              ))}
            </div>
          </div>
          <fieldset className="v-shape-studio__layers">
            <legend>02 / Layers</legend>
            {[
              {
                key: "fill",
                label: "Solid fill",
                value: filled,
                set: setFilled,
              },
              {
                key: "shadow",
                label: "Cast shadow",
                value: shadow,
                set: setShadow,
              },
              { key: "echo", label: "Rear outline", value: echo, set: setEcho },
            ].map((layer) => (
              <div key={layer.key}>
                <Label htmlFor={`${id}-${layer.key}`}>{layer.label}</Label>
                <Switch
                  id={`${id}-${layer.key}`}
                  checked={layer.value}
                  onCheckedChange={layer.set}
                />
              </div>
            ))}
          </fieldset>
          <div role="group" aria-label="Artwork motion">
            <p className="v-shape-studio__label">03 / Motion</p>
            <div className="v-shape-studio__motion">
              {[false, true].map((moving) => (
                <Button
                  key={String(moving)}
                  variant={ambient === moving ? "secondary" : "ghost"}
                  aria-pressed={ambient === moving}
                  onClick={() => setAmbient(moving)}
                >
                  <Icon name={moving ? "wind" : "pause"} />
                  {moving ? "Breathe" : "Still"}
                </Button>
              ))}
            </div>
            <p className="v-shape-studio__hint">
              Quiet settings always take priority.
            </p>
          </div>
        </div>
      </div>
      <div
        className="v-shape-studio__tray"
        role="group"
        aria-label="Signature silhouettes"
      >
        {signatureShapeNames.map((shape) => (
          <Button
            key={shape}
            data-studio-shape={shape}
            variant="ghost"
            aria-label={shapeLabels[shape]}
            aria-pressed={name === shape}
            onClick={() => choose(shape)}
          >
            <Shape
              name={shape}
              style={
                {
                  width: 36,
                  height: 36,
                  "--c": `var(--v-${tone})`,
                } as React.CSSProperties
              }
            />
            <small>{shapeLabels[shape]}</small>
          </Button>
        ))}
      </div>
      <Collapsible appearance="inline">
        <CollapsibleTrigger>Layer &amp; motion details</CollapsibleTrigger>
        <CollapsibleContent>
          <div className="v-shape-studio__details">
            <StudioSlider
              label="Rotation"
              value={rotation}
              onChange={setRotation}
            />
            <StudioSlider
              label="Shadow direction"
              value={shadowAngle}
              onChange={setShadowAngle}
              disabled={!shadow}
            />
            <StudioSlider
              label="Outline angle"
              value={echoAngle}
              onChange={setEchoAngle}
              disabled={!echo}
            />
            <StudioSlider
              label="Breathe cycle"
              value={duration}
              onChange={setDuration}
              min={4}
              max={20}
              unit="s"
              disabled={!ambient}
            />
            <div>
              <Label htmlFor={`${id}-target`}>Breathe towards</Label>
              <Select
                value={morphTo}
                onValueChange={(v) => setTarget(v as SignatureShapeName)}
                disabled={!ambient}
              >
                <SelectTrigger id={`${id}-target`} aria-label="Breathe towards">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {signatureShapeNames
                    .filter((s) => s !== name)
                    .map((s) => (
                      <SelectItem value={s} key={s}>
                        {shapeLabels[s]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="v-shape-studio__export">
        <div>
          <h4>Made here. Yours to use.</h4>
          <p>
            SVG is a still, transparent vector.
            <br />
            React keeps your layers and motion.
          </p>
        </div>
        <Button onClick={download}>
          <Icon name="download" />
          Download SVG
        </Button>
      </div>
      <CodeBlock
        code={shapeArtworkCode(options)}
        language="tsx"
        title="Your ShapeArtwork"
        copyLabel="Copy React snippet"
        onCopyResult={onCopyResult}
        wrap
      />
      <p className="v-shape-studio__receipt" role="status">
        {receipt ||
          "Twelve compatible contours. Every setting travels with your React snippet."}
      </p>
      <Collapsible appearance="inline">
        <CollapsibleTrigger>Every silhouette</CollapsibleTrigger>
        <CollapsibleContent>
          <p className="v-shape-studio__hint">
            {shapeNames.length} original masks, preserved. These are static
            Shape primitives; the twelve studio contours above can morph
            together.
          </p>
          <ScrollArea
            variant="plain"
            type="always"
            className="v-shape-studio__inventory"
            viewportProps={{
              tabIndex: 0,
              "aria-label": "Original shape inventory",
            }}
          >
            <div className="v-shape-studio__masks">
              {shapeNames.map((shape) => (
                <Button
                  key={shape}
                  data-legacy-shape={shape}
                  variant="ghost"
                  aria-label={`Copy ${shape} shape`}
                  onClick={() => copyMask(shape)}
                >
                  <Shape name={shape} style={{ width: 36, height: 36 }} />
                  <small>{shape}</small>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

export function ShapeExample() {
  return <ShapeStudio />;
}
export function ShapeArtworkExample({
  variant = "default",
  compact = false,
}: {
  variant?: string;
  compact?: boolean;
}) {
  return compact ? (
    <ShapeArtwork
      name="daisy-12"
      filled={variant !== "outline"}
      label="Layered silhouette"
      style={{ width: "100%", maxWidth: 220 }}
    />
  ) : (
    <ShapeStudio initialFilled={variant !== "outline"} />
  );
}
