import assert from "node:assert/strict";
import test from "node:test";

import {
  appendMovementPath,
  directionForKey,
  getDirectionAction,
  getMovementPath,
  isTextEntryTarget,
  unavailableDirectionMessage,
} from "../src/game-controls.js";

test("manual controls only emit symbols with an applicable PDA transition", () => {
  const security = {
    state: "q2",
    stack: ["Z", "C"],
    tape: ["i", "c"],
    cursor: 1,
    status: "running",
    logs: [{ ok: true, text: "Clona Cartão" }],
  };
  const beforeUnavailableMove = structuredClone(security);
  const unavailable = getDirectionAction(security, "W");

  assert.equal(unavailable, null);
  assert.deepEqual(security, beforeUnavailableMove);
  assert.match(unavailableDirectionMessage(security, "W"), /Movimento não disponível em q2 ao pressionar W/);
  assert.match(unavailableDirectionMessage(security, "W"), /Ações disponíveis: S — voltar ao Saguão/);

  const returnToLobby = getDirectionAction(security, "S");
  assert.equal(returnToLobby.symbol, "v");
  assert.equal(returnToLobby.state, "q1");
  assert.deepEqual(returnToLobby.stack, ["Z", "C"]);
});

test("gate buttons never emit a symbol without the matching stack top", () => {
  assert.equal(getDirectionAction({ state: "q4", stack: ["Z"] }, "W"), null);
  assert.equal(getDirectionAction({ state: "q4", stack: ["Z", "C"] }, "D"), null);
  assert.equal(getDirectionAction({ state: "q8", stack: ["Z", "M"] }, "D"), null);

  const openVault = getDirectionAction({ state: "q8", stack: ["Z"] }, "D");
  assert.equal(openVault.symbol, "f");
  assert.equal(openVault.state, "q5");

  const kitAtTop = { state: "q4", stack: ["Z", "K"] };
  assert.match(unavailableDirectionMessage(kitAtTop, "W"), /Ações disponíveis: S — apresentar o Kit K/);
});

test("keyboard controls map WASD and arrows while editable fields retain focus input", () => {
  assert.equal(directionForKey("w"), "W");
  assert.equal(directionForKey("ArrowUp"), "W");
  assert.equal(directionForKey("a"), "A");
  assert.equal(directionForKey("ArrowLeft"), "A");
  assert.equal(directionForKey("s"), "S");
  assert.equal(directionForKey("ArrowDown"), "S");
  assert.equal(directionForKey("d"), "D");
  assert.equal(directionForKey("ArrowRight"), "D");
  assert.equal(directionForKey("Enter"), null);

  assert.equal(isTextEntryTarget({ tagName: "INPUT" }), true);
  assert.equal(isTextEntryTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextEntryTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTextEntryTarget({ isContentEditable: true }), true);
});

test("movement paths keep q4, q7, and q8 in the same physical gate", () => {
  assert.deepEqual(getMovementPath("q4", "q7"), []);
  assert.deepEqual(getMovementPath("q7", "q8"), []);
  assert.deepEqual(getMovementPath("q4", "q8"), []);
});

test("queued movement appends routes without replacing pending waypoints", () => {
  const firstRoute = getMovementPath("q0", "q1");
  const nextRoute = getMovementPath("q1", "q2");
  const queued = appendMovementPath(firstRoute, nextRoute);

  assert.equal(queued.length, firstRoute.length + nextRoute.length);
  assert.deepEqual(queued.slice(0, firstRoute.length), firstRoute);
  assert.deepEqual(queued.slice(firstRoute.length), nextRoute);
});

test("opening the vault queues the turn through the gate before entering", () => {
  assert.deepEqual(getMovementPath("q8", "q5"), [
    { x: 590, y: 115 },
    { x: 830, y: 115 },
  ]);
});
