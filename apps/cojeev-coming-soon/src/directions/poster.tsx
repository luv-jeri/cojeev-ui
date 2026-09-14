import { useState } from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ShapeMorph } from "@/registry/cojeev/ui/shape";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import "./poster.css";

const possibilities = [
  { id: "memory", label: "Memory, shared." },
  { id: "harnesses", label: "Every agent, connected." },
  { id: "hooks", label: "Every prompt, your way." },
  { id: "identity", label: "One identity, everywhere." },
  { id: "subagents", label: "The right mind for the task." },
];

export function PosterDirection({ onExplore, paused }: {
  onExplore: (id?: string) => void;
  paused: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const { quiet } = useChoreography();

  return (
    <main className="poster-direction" data-quiet={paused || quiet || undefined}>
      <div className="poster-object" data-open={open}>
        <div className="poster-spine" aria-hidden="true" />
        <section
          id="poster-inside"
          className="poster-inside"
          aria-label="What is coming to Cojeev"
          inert={!open || undefined}
          aria-hidden={!open}
        >
          <p className="poster-inside-note">A little of what’s coming.</p>
          <div className="poster-possibilities">
            {possibilities.map(({ id, label }) => (
              <Button
                key={id}
                variant="ghost"
                className="poster-possibility"
                data-morph="fill"
                data-tier="tile"
                onClick={() => onExplore(id)}
              >
                <span>{label}</span>
                <AnimatedIcon name="arrow-up-right" />
              </Button>
            ))}
          </div>
          <ShapeMorph className="poster-inside-seal" name={open ? "clover-soft" : "seed-wing"} />
          <span className="poster-inside-edition">And room for more.</span>
        </section>

        <div className="poster-front" aria-hidden={open}>
          <div className="poster-front-art" aria-hidden="true">
            <ShapeMorph name={touched ? "cloud-3" : "seed-wing"} />
          </div>
          <h1 id="headline" tabIndex={-1} className="poster-title">more,<br /><span>together.</span></h1>
          <div className="poster-imprint" aria-hidden="true">
            <span>cojeev</span>
            <span>taking shape</span>
          </div>
          <div className="poster-curl" aria-hidden="true" />
        </div>

        <Button
          className="poster-peel"
          variant="default"
          data-morph="fill"
          data-tier="pill"
          data-reach="7"
          aria-expanded={open}
          aria-controls="poster-inside"
          onPointerEnter={() => setTouched(true)}
          onPointerLeave={() => setTouched(false)}
          onFocus={() => setTouched(true)}
          onBlur={() => setTouched(false)}
          onClick={() => setOpen(value => !value)}
        >
          <span>{open ? "Fold it back" : "Peel it back"}</span>
          <AnimatedIcon name={open ? "undo-2" : "arrow-left"} />
        </Button>
      </div>
    </main>
  );
}
