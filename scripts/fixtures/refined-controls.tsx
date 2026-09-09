import * as React from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../../registry/cojeev/ui/button";
import {
  Checkbox,
  type SelectorShape,
} from "../../registry/cojeev/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../registry/cojeev/ui/radio-group";
import { Dropzone } from "../../registry/cojeev/ui/dropzone";
import {
  RefinedCalendarExample,
  RefinedDatePickerExample,
  RefinedQuestionnaireExample,
  RefinedRadioGroupExample,
} from "../../components/examples/refined-controls";
import {
  setMotionMode,
  setFlowSettings,
} from "../../registry/cojeev/motion/settings";
const shapes: SelectorShape[] = [
  "organic",
  "pebble",
  "rounded",
  "circle",
  "leaf",
  "flower",
];
const variants = [
  "default",
  "secondary",
  "accent",
  "outline",
  "ghost",
  "danger",
] as const;
const host = document.createElement("main");
host.id = "refinement-fixture";
for (const child of Array.from(document.body.children))
  if (child instanceof HTMLElement) child.style.display = "none";
document.body.append(host);
Object.assign(window, {
  __setRefinementMode: (mode: string) => {
    setMotionMode(mode === "off" ? "off" : "subtle");
    setFlowSettings({ variant: mode === "flow-off" ? "off" : "pebble" });
  },
});
function Fixture() {
  const [busy, setBusy] = React.useState(false),
    [events, setEvents] = React.useState<string[]>([]);
  const log = (event: string) => setEvents((old) => [...old, event]);
  return (
    <>
      <h1>Controls with a little character</h1>
      <section id="buttons">
        <h2>Button surfaces</h2>
        <Button id="busy-toggle" onClick={() => setBusy((v) => !v)}>
          Toggle busy
        </Button>
        <div className="rf-button-matrix">
          {variants.map((variant) => (
            <div className="rf-button-row" key={variant}>
              <b>{variant}</b>
              <Button
                data-case={`${variant}-rest`}
                variant={variant}
                onClick={() => log(`${variant}-clicked`)}
              >
                Continue
              </Button>
              <Button
                data-case={`${variant}-disabled`}
                variant={variant}
                disabled
                onClick={() => log("disabled-clicked")}
              >
                Unavailable
              </Button>
              <Button
                data-case={`${variant}-busy`}
                variant={variant}
                loading={busy}
                onClick={() => log("busy-clicked")}
              >
                Save changes
              </Button>
            </div>
          ))}
        </div>
      </section>
      <section id="selectors">
        <h2>Choose your silhouette</h2>
        <div className="rf-selector-matrix">
          {shapes.map((shape, index) => (
            <div
              data-shape-case={shape}
              key={shape}
              className="rf-selector-panel"
            >
              <h3>{shape}</h3>
              <Checkbox
                data-case="check"
                shape={shape}
                tone={
                  (
                    ["pink", "blue", "olive", "yellow", "pink", "blue"] as const
                  )[index]
                }
                onCheckedChange={(value) => log(`${shape}-check-${value}`)}
              >
                Keep this idea
              </Checkbox>
              <Checkbox
                shape={shape}
                defaultChecked="indeterminate"
                tone="blue"
              >
                Part of a collection
              </Checkbox>
              <Checkbox shape={shape} defaultChecked disabled>
                Managed selection
              </Checkbox>
              <RadioGroup
                shape={shape}
                defaultValue="one"
                aria-label={`${shape} options`}
                onValueChange={(value) => log(`${shape}-radio-${value}`)}
              >
                <RadioGroupItem value="one">One good option</RadioGroupItem>
                <RadioGroupItem value="two" tone="blue">
                  Another way
                </RadioGroupItem>
                <RadioGroupItem value="three" disabled>
                  Unavailable
                </RadioGroupItem>
              </RadioGroup>
            </div>
          ))}
        </div>
      </section>
      <section id="pictographic">
        <h2>A different kind of focus</h2>
        <RefinedRadioGroupExample variant="flower" />
      </section>
      <section id="calendar-section">
        <h2>Time, with room to breathe</h2>
        <div className="rf-two-column">
          <div id="calendar">
            <RefinedCalendarExample />
          </div>
          <div id="date-picker">
            <RefinedDatePickerExample />
          </div>
        </div>
      </section>
      <section id="dropzones">
        <h2>A place for your files</h2>
        <div className="rf-two-column">
          {(["default", "compact"] as const).map((variant) => (
            <div key={variant} data-drop-case={variant}>
              <Dropzone
                variant={variant}
                accept=".txt,image/*"
                maxSize={4096}
                onFilesSelected={(files) =>
                  log(`${variant}-files-${files.length}`)
                }
                onFilesRejected={(files) =>
                  log(`${variant}-rejected-${files[0]?.code}`)
                }
              />
            </div>
          ))}
        </div>
      </section>
      <section id="questionnaires">
        <h2>A choice that feels like yours</h2>
        <div className="rf-questionnaire-matrix">
          {shapes.map((shape) => (
            <div key={shape} data-questionnaire-case={shape}>
              <h3>{shape}</h3>
              <RefinedQuestionnaireExample variant={shape} />
            </div>
          ))}
        </div>
      </section>
      <output id="events" aria-live="polite">
        {events.join(" | ")}
      </output>
    </>
  );
}
createRoot(host).render(<Fixture />);
