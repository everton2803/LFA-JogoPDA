import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FINAL_STATE, INITIAL_STATE, STATES, TRANSITIONS } from "../src/pda.js";
import { renderJflapXml } from "../scripts/generate-jflap.mjs";

const xml = readFileSync(new URL("../assalto_banco_nao_linear_pda.xml", import.meta.url), "utf8");
const states = [...xml.matchAll(/<state id="(\d+)" name="([^"]+)">([\s\S]*?)<\/state>/g)];
const nameById = new Map(states.map(([, id, name]) => [id, name]));
const xmlTransitions = [...xml.matchAll(/<transition>([\s\S]*?)<\/transition>/g)].map(([, block]) => {
  const value = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? "";

  return [
    nameById.get(value("from")),
    value("read"),
    value("pop"),
    nameById.get(value("to")),
    value("push"),
  ].join("|");
});

test("keeps the current JavaScript PDA and JFLAP XML equivalent", () => {
  const jsTransitions = TRANSITIONS.map(({ from, read, pop, to, push }) => (
    [from, read, pop, to, push.join("")].join("|")
  ));
  const initialStates = states.filter(([, , , body]) => body.includes("<initial/>"));
  const finalStates = states.filter(([, , , body]) => body.includes("<final/>"));

  assert.deepEqual(states.map(([, , name]) => name), STATES);
  assert.deepEqual(initialStates.map(([, , name]) => name), [INITIAL_STATE]);
  assert.deepEqual(finalStates.map(([, , name]) => name), [FINAL_STATE]);
  assert.deepEqual(jsTransitions, xmlTransitions);
});

test("keeps the committed JFLAP XML synchronized with the generator", () => {
  assert.equal(renderJflapXml(), xml);
});
