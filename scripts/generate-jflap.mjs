import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { FINAL_STATE, INITIAL_STATE, STATES, TRANSITIONS } from "../src/pda.js";

const stateLayout = Object.freeze({
  q0: { x: 80, y: 260, label: "Beco / Entrada" },
  q1: { x: 260, y: 260, label: "Saguao Central" },
  q2: { x: 260, y: 100, label: "Sala Seguranca" },
  q3: { x: 260, y: 420, label: "Sala de TI" },
  q4: { x: 480, y: 260, label: "Portao Blindado" },
  q5: { x: 680, y: 260, label: "Cofre" },
  q6: { x: 880, y: 260, label: "Corredor Fuga" },
  q7: { x: 480, y: 100, label: "Portao - primeira credencial" },
  q8: { x: 480, y: 420, label: "Portao destravado" },
  qf: { x: 1080, y: 260, label: "Garagem / Fuga" },
});

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const stateIds = new Map(STATES.map((state, index) => [state, String(index)]));

export const renderJflapXml = () => {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    "<!--Generated from src/pda.js by scripts/generate-jflap.mjs.-->",
    "<structure>",
    "\t<type>pda</type>",
    "\t<automaton>",
    "\t\t<!--The list of states.-->",
  ];

  for (const state of STATES) {
    const id = stateIds.get(state);
    const { x, y, label } = stateLayout[state];
    lines.push(
      `\t\t<state id="${id}" name="${escapeXml(state)}">`,
      `\t\t\t<x>${x}.0</x>`,
      `\t\t\t<y>${y}.0</y>`,
      `\t\t\t<label>${escapeXml(label)}</label>`,
    );
    if (state === INITIAL_STATE) lines.push("\t\t\t<initial/>");
    if (state === FINAL_STATE) lines.push("\t\t\t<final/>");
    lines.push("\t\t</state>");
  }

  lines.push("\t\t<!--The list of transitions.-->");
  for (const { from, read, pop, to, push } of TRANSITIONS) {
    const replacement = push.join("");
    lines.push(
      "\t\t<transition>",
      `\t\t\t<from>${stateIds.get(from)}</from>`,
      `\t\t\t<to>${stateIds.get(to)}</to>`,
      `\t\t\t<read>${escapeXml(read)}</read>`,
      `\t\t\t<pop>${escapeXml(pop)}</pop>`,
      replacement
        ? `\t\t\t<push>${escapeXml(replacement)}</push>`
        : "\t\t\t<push/>",
      "\t\t</transition>",
    );
  }

  lines.push("\t</automaton>", "</structure>");
  return `${lines.join("\n")}\n`;
};

const isDirectExecution = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  await writeFile(new URL("../assalto_banco_nao_linear_pda.xml", import.meta.url), renderJflapXml(), "utf8");
  process.stdout.write("Generated assalto_banco_nao_linear_pda.xml from src/pda.js\n");
}
