import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

const bundle = await build({
  stdin: {
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { flushSync } from "react-dom";
      import { useFlowPress } from "./registry/cojeev/motion/flow-press";
      import { setFlowSettings } from "./registry/cojeev/motion/settings";
      import { Button } from "./registry/cojeev/ui/button";
      import { IconButton } from "./registry/cojeev/ui/icon";
      import { Item } from "./registry/cojeev/ui/item";

      const root = createRoot(document.getElementById("root"));
      let props = {
        disabledButton: true,
        loadingButton: true,
        ariaDisabledIcon: true,
        inertIcon: true,
        hiddenItem: true,
        dataDisabledItem: true,
        batchState: "disabled",
        itemPressed: false,
        checkedState: "checked",
        toggleState: "on",
        disclosureState: "open",
        idleState: "idle",
        customState: "custom-a",
        introducedState: null,
        cleanupMounted: true,
      };

      function HookControl({ id, state }) {
        const ref = useFlowPress();
        return <button id={id} ref={ref} data-state={state}>{id}</button>;
      }

      function Fixture() {
        return <>
          <Button id="disabled-button" disabled={props.disabledButton}>Disabled readiness</Button>
          <Button id="loading-button" loading={props.loadingButton}>Loading readiness</Button>
          <IconButton id="aria-disabled-icon" aria-label="Aria readiness" aria-disabled={props.ariaDisabledIcon || undefined} />
          <IconButton id="inert-icon" aria-label="Inert readiness" inert={props.inertIcon || undefined} />
          <Item id="hidden-item" hidden={props.hiddenItem}>Hidden readiness</Item>
          <Item id="data-disabled-item" data-disabled={props.dataDisabledItem ? "" : undefined}>Data readiness</Item>
          <Button id="batch-button" disabled={props.batchState === "disabled"} loading={props.batchState === "busy"}>Batch readiness</Button>
          <Button id="pointer-button">Pointer activation</Button>
          <IconButton id="keyboard-icon" aria-label="Keyboard activation" />
          <Item id="selection-item" aria-pressed={props.itemPressed}>Selection</Item>
          <HookControl id="checked-control" state={props.checkedState} />
          <HookControl id="toggle-control" state={props.toggleState} />
          <HookControl id="disclosure-control" state={props.disclosureState} />
          <HookControl id="idle-control" state={props.idleState} />
          <HookControl id="custom-control" state={props.customState} />
          <HookControl id="introduced-control" state={props.introducedState} />
          <Button id="quiet-button">Quiet activation</Button>
          {props.cleanupMounted && <Button
            id="cleanup-button"
            data-flow-land="seed-land"
            style={{
              scale: "1.2",
              "--flow-ease": "linear",
              "--flow-dur": "9s",
              "--flow-land": "seed-token",
              "--flow-glow": "seed-glow",
            }}
          >Cleanup</Button>}
        </>;
      }

      function render() {
        flushSync(() => root.render(<Fixture />));
      }

      window.patchFixture = patch => {
        props = { ...props, ...patch };
        render();
      };
      window.renderBatchReady = () => {
        props = { ...props, batchState: "busy" };
        render();
        props = { ...props, batchState: "rest" };
        render();
      };
      window.setFlowVariant = variant => setFlowSettings({ variant });
      render();
    `,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
});

const availabilityIds = [
  "disabled-button",
  "loading-button",
  "aria-disabled-icon",
  "inert-icon",
  "hidden-item",
  "data-disabled-item",
];

test("flow press distinguishes readiness from semantic state and input", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });

    await page.evaluate(ids => {
      const counts = new Map();
      const styles = new Map();
      const nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
        const id = styles.get(this);
        if (id && name === "scale") counts.set(id, (counts.get(id) ?? 0) + 1);
        return nativeSetProperty.call(this, name, value, priority);
      };
      window.watchFlowPulses = watchIds => {
        for (const id of watchIds) {
          const node = document.getElementById(id);
          counts.set(id, 0);
          styles.set(node.style, id);
        }
      };
      window.resetFlowPulses = watchIds => {
        for (const id of watchIds) counts.set(id, 0);
      };
      window.readFlowPulses = watchIds => Object.fromEntries(watchIds.map(id => [id, counts.get(id) ?? 0]));
      window.watchFlowPulses(ids);
    }, [
      ...availabilityIds,
      "batch-button",
      "pointer-button",
      "keyboard-icon",
      "selection-item",
      "checked-control",
      "toggle-control",
      "disclosure-control",
      "idle-control",
      "custom-control",
      "introduced-control",
      "quiet-button",
      "cleanup-button",
    ]);

    await page.evaluate(() => window.patchFixture({
      disabledButton: false,
      loadingButton: false,
      ariaDisabledIcon: false,
      inertIcon: false,
      hiddenItem: false,
      dataDisabledItem: false,
    }));
    await page.waitForTimeout(80);
    assert.deepEqual(
      await page.evaluate(ids => window.readFlowPulses(ids), availabilityIds),
      Object.fromEntries(availabilityIds.map(id => [id, 0])),
      "programmatic readiness must not produce press feedback",
    );

    const batch = await page.evaluate(async () => {
      const node = document.getElementById("batch-button");
      const oldValues = [];
      const observer = new MutationObserver(records => {
        for (const record of records) {
          if (record.attributeName === "data-state") oldValues.push(record.oldValue);
        }
      });
      observer.observe(node, { attributes: true, attributeFilter: ["data-state"], attributeOldValue: true });
      window.renderBatchReady();
      await new Promise(resolve => setTimeout(resolve, 80));
      observer.disconnect();
      return {
        oldValues,
        finalValue: node.getAttribute("data-state"),
        pulses: window.readFlowPulses(["batch-button"])["batch-button"],
      };
    });
    assert.deepEqual(batch.oldValues, ["disabled", "busy"], "fixture must expose both old values in one readiness batch");
    assert.equal(batch.finalValue, "rest");
    assert.equal(batch.pulses, 0, "disabled to busy to rest must remain quiet");

    const unsupportedIds = ["idle-control", "custom-control", "introduced-control"];
    await page.evaluate(() => window.patchFixture({
      idleState: "ready",
      customState: "custom-b",
      introducedState: "custom",
    }));
    await page.waitForTimeout(80);
    assert.deepEqual(
      await page.evaluate(ids => window.readFlowPulses(ids), unsupportedIds),
      Object.fromEntries(unsupportedIds.map(id => [id, 0])),
      "unsupported data-state changes must remain quiet",
    );

    await page.getByRole("button", { name: "Pointer activation", exact: true }).click();
    await page.getByRole("button", { name: "Keyboard activation", exact: true }).press("Enter");
    await page.evaluate(() => window.patchFixture({ itemPressed: true }));
    await page.waitForTimeout(80);
    for (const id of ["pointer-button", "keyboard-icon", "selection-item"]) {
      assert.ok(
        (await page.evaluate(id => window.readFlowPulses([id])[id], id)) > 0,
        `${id} must retain real activation or selection feedback`,
      );
    }

    await page.evaluate(() => window.patchFixture({
      checkedState: "unchecked",
      toggleState: "off",
      disclosureState: "closed",
    }));
    await page.waitForTimeout(80);
    for (const id of ["checked-control", "toggle-control", "disclosure-control"]) {
      assert.ok(
        (await page.evaluate(id => window.readFlowPulses([id])[id], id)) > 0,
        `${id} semantic data-state transition must retain feedback`,
      );
    }

    await page.evaluate(() => {
      window.setFlowVariant("off");
      window.resetFlowPulses(["quiet-button"]);
    });
    await page.getByRole("button", { name: "Quiet activation", exact: true }).click();
    await page.waitForTimeout(40);
    assert.equal(
      await page.evaluate(() => window.readFlowPulses(["quiet-button"])["quiet-button"]),
      0,
      "Flow Off must keep activation functional without motion",
    );

    const cleanupNode = await page.locator("#cleanup-button").elementHandle();
    await page.evaluate(() => window.setFlowVariant("glide"));
    await page.locator("#cleanup-button").dispatchEvent("pointerup");
    await page.waitForTimeout(40);
    assert.notEqual(await cleanupNode.evaluate(node => node.style.getPropertyValue("scale")), "1.2", "fixture must start a pulse before cancellation");
    await page.evaluate(() => window.setFlowVariant("off"));
    assert.deepEqual(await cleanupNode.evaluate(node => ({
      land: node.getAttribute("data-flow-land"),
      scale: node.style.getPropertyValue("scale"),
      ease: node.style.getPropertyValue("--flow-ease"),
      duration: node.style.getPropertyValue("--flow-dur"),
      token: node.style.getPropertyValue("--flow-land"),
      glow: node.style.getPropertyValue("--flow-glow"),
    })), {
      land: "seed-land",
      scale: "1.2",
      ease: "linear",
      duration: "9s",
      token: "seed-token",
      glow: "seed-glow",
    }, "quiet cancellation must restore caller-owned inline state");

    await page.evaluate(() => {
      window.setFlowVariant("glide");
      document.getElementById("cleanup-button").dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      window.patchFixture({ cleanupMounted: false });
    });
    assert.deepEqual(await cleanupNode.evaluate(node => ({
      land: node.getAttribute("data-flow-land"),
      scale: node.style.getPropertyValue("scale"),
      ease: node.style.getPropertyValue("--flow-ease"),
      duration: node.style.getPropertyValue("--flow-dur"),
      token: node.style.getPropertyValue("--flow-land"),
      glow: node.style.getPropertyValue("--flow-glow"),
    })), {
      land: "seed-land",
      scale: "1.2",
      ease: "linear",
      duration: "9s",
      token: "seed-token",
      glow: "seed-glow",
    }, "unmount must restore caller-owned inline state");
  } finally {
    await browser.close();
  }
});
