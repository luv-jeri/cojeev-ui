/** Interaction cases for the shipped composite examples, shared by the release docs gate. */
export function createCompositeTests({ assert, eventually, text, attribute, key }) {
  async function settled(root, kind) {
    const composition = root.locator('[data-slot="organism-composition"]').first();
    await composition.scrollIntoViewIfNeeded();
    await eventually(async () => await composition.getAttribute("data-kind") === kind
      && await composition.getAttribute("data-settled") === "true"
      && await composition.getAttribute("data-assembled") === "true", `${kind} composition settles into usable native controls`, 8000);
    return composition;
  }

  async function conversation(root) {
    const composition = await settled(root, "chat");
    const bubbles = composition.locator('[data-slot="bubble-content"]');
    assert(await bubbles.count() >= 3, "Initial conversation uses native bubbles");
    const input = composition.getByRole("textbox", { name: "Your message", exact: true });
    const send = composition.getByRole("button", { name: "Send message", exact: true });
    assert(await send.isDisabled(), "Empty messages cannot be sent");
    await input.fill("   ");
    assert(await send.isDisabled(), "Whitespace messages cannot be sent");
    await input.fill("One useful keyboard thought.");
    await input.press("Enter");
    await text(composition.getByRole("log"), "One useful keyboard thought.");
    assert.equal(await input.inputValue(), "");
    await input.fill("And one pointer thought.");
    await send.click();
    await text(composition.getByRole("log"), "And one pointer thought.");
    await composition.getByRole("button", { name: "Clear conversation", exact: true }).click();
    await text(composition, "A fresh page.");
    await eventually(async () => await bubbles.count() === 0, "Clear removes messages after their exit animation");
    return "Native bubbles; empty/whitespace send guard; keyboard and pointer sends clear draft; clear restores empty conversation.";
  }

  async function taskPanel(root, kind) {
    const composition = await settled(root, kind);
    const progress = composition.getByRole("progressbar", { name: "Completed tasks", exact: true });
    await attribute(progress, "aria-valuenow", "33");
    const task = index => composition.locator(`[data-assembly-part="task-${index}"]`);
    await task(1).click();
    await attribute(task(1), "aria-pressed", "true");
    await key(task(2), "Enter");
    await attribute(task(2), "aria-pressed", "true");
    await attribute(progress, "aria-valuenow", "100");
    await text(composition, "Look at that. All done.");
    await composition.getByRole("button", { name: "Start fresh", exact: true }).click();
    await attribute(progress, "aria-valuenow", "0");
    for (const index of [0, 1, 2]) await attribute(task(index), "aria-pressed", "false");
    return "Pointer and keyboard task completion update progress to 100%; Start fresh clears all tasks and progress.";
  }

  return {
    "action-dock": async ({ root }) => {
      const composition = await settled(root, "dock");
      const home = composition.getByRole("button", { name: "Home", exact: true });
      const files = composition.getByRole("button", { name: "Files", exact: true });
      const inbox = composition.getByRole("button", { name: "Inbox", exact: true });
      await attribute(home, "aria-pressed", "true");
      await files.click();
      await attribute(files, "aria-pressed", "true");
      await attribute(home, "aria-pressed", "false");
      await text(composition, "The useful things, together");
      await key(inbox, "Enter");
      await attribute(inbox, "aria-pressed", "true");
      await attribute(files, "aria-pressed", "false");
      await text(composition, "A little room for new ideas");
      return "Pointer and keyboard dock selection update the exclusive selected state and destination description.";
    },

    "assembly-part": async ({ root }) => {
      const part = root.locator('[data-assembly-part="example-button"]');
      await part.scrollIntoViewIfNeeded();
      await eventually(() => part.evaluate(node => !node.inert), "Initial assembly part becomes interactive", 8000);
      const retained = await part.elementHandle();
      try {
        await part.click();
        await attribute(part, "aria-label", "Press count: 1");
        await root.getByRole("button", { name: "Reshape the same button", exact: true }).click();
        await attribute(part, "data-assembly-released", "true");
        await eventually(() => part.evaluate(node => !node.inert && node.style.clipPath === "" && node.getBoundingClientRect().width > 200), "Expanded part releases clipping and native interaction", 8000);
        assert(await part.evaluate((node, previous) => node === previous, retained), "Reshape preserves the actual button element");
        await key(part, "Enter");
        await attribute(part, "aria-label", "Press count: 2");
        await root.getByRole("button", { name: "Reshape the same button", exact: true }).click();
        await eventually(() => part.evaluate(node => !node.inert && Number.parseFloat(getComputedStyle(node).width) < 100), "The same part returns to its compact contour", 8000);
        await attribute(part, "aria-label", "Press count: 2");
      } finally { await retained?.dispose(); }
      return "Real button retains DOM identity and press count through expand/compact reshapes; pointer and keyboard remain usable.";
    },

    "compact-dashboard": async ({ root }) => {
      await text(root, "Historical sample");
      return `Historical task-panel alias: ${await taskPanel(root, "dashboard")}`;
    },

    "conversation-panel": async ({ root }) => conversation(root),

    "focus-session": async ({ page, root }) => {
      const composition = await settled(root, "focus");
      const timer = composition.getByRole("timer");
      const receipt = root.locator('[data-example-receipt="focus-session"]');
      const initial = await timer.getAttribute("aria-label");
      await composition.getByRole("button", { name: "Start focusing", exact: true }).click();
      await text(receipt, "Your local focus session has started.");
      await eventually(async () => await timer.getAttribute("aria-label") !== initial, "Real focus countdown advances", 4000);
      await key(composition.getByRole("button", { name: "Pause", exact: true }), "Enter");
      await text(receipt, "Paused. Your remaining time is kept here.");
      const paused = await timer.getAttribute("aria-label");
      await page.waitForTimeout(1100);
      assert.equal(await timer.getAttribute("aria-label"), paused, "Paused timer retains remaining time");
      await key(composition.getByRole("button", { name: "Resume", exact: true }), "Enter");
      await text(receipt, "Your local focus session has started.");
      await composition.getByRole("button", { name: "Reset focus session", exact: true }).click();
      await attribute(timer, "aria-label", initial);
      await attribute(composition.getByRole("progressbar"), "aria-valuenow", "0");
      await key(root.getByRole("radio", { name: "15 minutes", exact: true }), "Enter");
      await text(receipt, "A fresh 15-minute session is ready.");
      await attribute(root.getByRole("timer"), "aria-label", "15 minutes 0 seconds remaining");
      return "Elapsed-time countdown advances, keyboard pause holds time, resume works, reset clears progress, and duration selection creates a fresh session.";
    },

    "invite-card": async ({ root }) => {
      const composition = await settled(root, "invite");
      const yes = composition.locator('[data-assembly-part="primary"]');
      const no = composition.locator('[data-assembly-part="secondary"]');
      const receipt = root.locator('[data-example-receipt="invite-card"]');
      await yes.click();
      await attribute(yes, "aria-pressed", "true");
      await attribute(no, "aria-pressed", "false");
      await text(receipt, "Marked as attending in this local preview.");
      await key(no, "Enter");
      await attribute(no, "aria-pressed", "true");
      await attribute(yes, "aria-pressed", "false");
      await text(receipt, "Marked as unable to attend in this local preview.");
      return "Pointer acceptance and keyboard decline update mutually exclusive RSVP states and the example's local-only receipt.";
    },

    "organism-assembly": async ({ root }) => {
      const assembly = root.locator('[data-slot="organism-assembly"]');
      await assembly.scrollIntoViewIfNeeded();
      const assemble = assembly.getByRole("button", { name: "Assemble", exact: true });
      const replay = assembly.getByRole("button", { name: "Replay assembly", exact: true });
      const animated = !await replay.isDisabled();
      if (animated) await assemble.click();
      const composition = await settled(root, "profile");
      const follow = composition.locator('[data-assembly-part="primary"]');
      await follow.click();
      await attribute(follow, "aria-pressed", "true");
      const retained = await follow.elementHandle();
      try {
        if (animated) {
          await replay.click();
          await attribute(composition, "data-assembled", "false");
          assert(await follow.evaluate(node => node.inert), "Travelling control is temporarily inert");
          await settled(root, "profile");
          assert(await follow.evaluate((node, previous) => node === previous, retained), "Replay keeps the original control");
          await attribute(follow, "aria-pressed", "true");
        }
      } finally { await retained?.dispose(); }
      await assembly.getByRole("button", { name: "Dock", exact: true }).click();
      await settled(root, "dock");
      await key(assembly.getByRole("button", { name: "Dock", exact: true }), "ArrowRight");
      await settled(root, "chat");
      await conversation(root);
      return "Assembly/replay preserve native control identity and state; pointer choices and arrow-key navigation produce an interactive native chat.";
    },

    "organism-composition": async ({ root }) => conversation(root),

    "profile-card": async ({ root }) => {
      const composition = await settled(root, "profile");
      const follow = composition.locator('[data-assembly-part="primary"]');
      await follow.click();
      await attribute(follow, "aria-pressed", "true");
      const save = composition.getByRole("button", { name: "Save profile", exact: true });
      await key(save, "Enter");
      await attribute(save, "aria-pressed", "true");
      const message = composition.getByRole("button", { name: "Message", exact: true });
      await key(message, "Enter");
      await attribute(message, "aria-expanded", "true");
      const input = composition.getByRole("textbox", { name: "Write a note", exact: true });
      await eventually(() => input.evaluate(node => node === document.activeElement), "Opening profile composer moves focus into the native input", 8000);
      await input.fill("A local note from the keyboard.");
      await input.press("Enter");
      await eventually(async () => await input.inputValue() === "", "Saving the note clears the draft");
      await text(composition, "Note saved");
      await message.click();
      await attribute(message, "aria-expanded", "false");
      assert.equal(await composition.getByRole("textbox", { name: "Write a note", exact: true }).count(), 0);
      return "Follow/save retain state; keyboard-opened message composer receives focus, saves a local note and closes cleanly.";
    },

    "work-side-panel": async ({ root }) => taskPanel(root, "side-panel"),
  };
}
