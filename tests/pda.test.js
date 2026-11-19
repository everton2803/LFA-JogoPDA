import assert from "node:assert/strict";
import test from "node:test";

import {
  FINAL_STATE,
  INPUT_SYMBOLS,
  STATES,
  TRANSITIONS,
  applyTransition,
  createInitialConfiguration,
  runSequence,
} from "../src/pda.js";

test("preserves the existing PDA definition", () => {
  assert.deepEqual(STATES, ["q0", "q1", "q2", "q3", "q4", "q5", "q6", "qf"]);
  assert.equal(FINAL_STATE, "qf");
  assert.equal(TRANSITIONS.length, 17);
  assert.deepEqual(INPUT_SYMBOLS, [..."ickvpdsfmrle"]);
  assert.ok(Object.isFrozen(TRANSITIONS));
  assert.ok(TRANSITIONS.every(({ push }) => Object.isFrozen(push)));

  const keys = TRANSITIONS.map(({ from, read, pop }) => `${from}|${read}|${pop}`);
  assert.equal(new Set(keys).size, keys.length, "transition rules must be deterministic");
});

test("creates a fresh initial configuration with Z at the bottom of the stack", () => {
  const first = createInitialConfiguration();
  const second = createInitialConfiguration();

  assert.deepEqual(first, { state: "q0", stack: ["Z"] });
  assert.notEqual(first.stack, second.stack);
});

test("applies every existing rule without mutating its input configuration", () => {
  for (const rule of TRANSITIONS) {
    const stack = rule.pop === "Z" ? ["Z"] : ["Z", rule.pop];
    const configuration = { state: rule.from, stack };
    const originalStack = [...stack];
    const result = applyTransition(configuration, rule.read);

    assert.ok(result, `missing rule: ${rule.from}, ${rule.read}, ${rule.pop}`);
    assert.equal(result.state, rule.to);
    assert.deepEqual(result.stack, [
      ...(rule.pop === "Z" ? [] : ["Z"]),
      ...rule.push.slice().reverse(),
    ]);
    assert.deepEqual(configuration.stack, originalStack);
  }
});

test("keeps the stack top at the end of the array and preserves the current game flow", () => {
  assert.deepEqual(runSequence("ic").stack, ["Z", "C"]);
  assert.deepEqual(runSequence("ik").stack, ["Z", "K"]);
  assert.deepEqual(runSequence("icvkvpsdf").stack, ["Z"]);
  assert.deepEqual(runSequence("icvkvpsdfmmrll").stack, ["Z"]);
});

test("accepts the two existing successful examples", () => {
  assert.equal(runSequence("icvkvpsdfmrle").accepted, true);
  assert.equal(runSequence("ikvcvpdsfmmrlle").accepted, true);
});

test("rejects the two existing unsuccessful examples", () => {
  assert.equal(runSequence("icvkvpdsfmrle").accepted, false);
  assert.equal(runSequence("icvkvpsdfmmrle").accepted, false);
});

test("acceptance requires consuming the complete input in qf", () => {
  assert.equal(runSequence("").accepted, false);
  assert.equal(runSequence("icvkvpsdfmrle").state, FINAL_STATE);
  assert.equal(runSequence("icvkvpsdfmrlee").accepted, false);
  assert.equal(runSequence("icvkvpsdfm").accepted, false);
  assert.equal(runSequence("xyz").accepted, false);
});

test("an undefined transition leaves the original configuration unchanged", () => {
  const configuration = { state: "q2", stack: ["Z", "C"] };
  const snapshot = { state: configuration.state, stack: [...configuration.stack] };

  assert.equal(applyTransition(configuration, "c"), null);
  assert.deepEqual(configuration, snapshot);
});

test("all inputs through length four execute deterministically without exceptions", () => {
  const visit = (prefix, remaining) => {
    const result = runSequence(prefix);
    assert.equal(typeof result.accepted, "boolean");
    assert.equal(result.stack[0], "Z");
    assert.equal(result.stack.filter((symbol) => symbol === "Z").length, 1);

    if (remaining === 0) return;
    for (const symbol of INPUT_SYMBOLS) visit(prefix + symbol, remaining - 1);
  };

  visit("", 4);
});

test.todo("rejects opening the vault after collecting only C", () => {
  assert.equal(runSequence("icvpdfmrle").accepted, false);
});

test.todo("rejects opening the vault after collecting only K", () => {
  assert.equal(runSequence("ikvpsfmrle").accepted, false);
});
