import assert from "node:assert/strict";
import test from "node:test";
import { groundToneForBackdrop } from "../components/landing/assembly/choreography";

test("scene copy tone follows contrast instead of the nearest chapter", () => {
  assert.equal(groundToneForBackdrop("#0b0b0c"), "dark");
  assert.equal(groundToneForBackdrop("#141110"), "dark");
  assert.equal(groundToneForBackdrop("#b6caeb"), "light");
  assert.equal(groundToneForBackdrop("#f5d867"), "light");
});

test("scene copy tone rejects colours outside the renderer's six-digit format", () => {
  assert.throws(() => groundToneForBackdrop("blue"), /six-digit sRGB colour/);
});
