import { applyTransition } from "./pda.js";
import { gateActionForDirection, physicalRoomByState, STATES_META } from "./game-config.js";

const DIRECTION_SYMBOLS = Object.freeze({
  q0: Object.freeze({ D: "i" }),
  q1: Object.freeze({ W: "c", S: "k", D: "p" }),
  q2: Object.freeze({ S: "v" }),
  q3: Object.freeze({ W: "v" }),
  q5: Object.freeze({ A: "m", W: "m", S: "r", D: "r" }),
  q6: Object.freeze({ A: "l", W: "l", S: "e", D: "e" }),
});

const KEY_DIRECTIONS = Object.freeze({
  W: "W",
  ARROWUP: "W",
  A: "A",
  ARROWLEFT: "A",
  S: "S",
  ARROWDOWN: "S",
  D: "D",
  ARROWRIGHT: "D",
});

const DIRECTION_ACTION_LABELS = Object.freeze({
  q0: Object.freeze({ D: "entrar no Saguão" }),
  q1: Object.freeze({ W: "ir à Segurança (Cartão)", S: "ir à TI (Kit)", D: "avançar ao Portão" }),
  q2: Object.freeze({ S: "voltar ao Saguão" }),
  q3: Object.freeze({ W: "voltar ao Saguão" }),
  q4: Object.freeze({ W: "apresentar o Cartão C", S: "apresentar o Kit K" }),
  q7: Object.freeze({ W: "apresentar o Cartão C", S: "apresentar o Kit K" }),
  q8: Object.freeze({ D: "abrir o Cofre" }),
  q5: Object.freeze({ W: "pegar malote", A: "pegar malote", S: "ir ao Corredor", D: "ir ao Corredor" }),
  q6: Object.freeze({ W: "ocultar malote", A: "ocultar malote", S: "escapar na Garagem", D: "escapar na Garagem" }),
});

export const directionForKey = (key) => KEY_DIRECTIONS[String(key).toUpperCase()] ?? null;

export const isTextEntryTarget = (target) => Boolean(
  target?.isContentEditable
  || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName),
);

export const getDirectionAction = (configuration, direction) => {
  const symbol = gateActionForDirection(configuration.state, direction)
    ?? DIRECTION_SYMBOLS[configuration.state]?.[direction]
    ?? null;
  if (!symbol) return null;

  const transition = applyTransition(configuration, symbol);
  return transition ? { symbol, ...transition } : null;
};

export const unavailableDirectionMessage = (configuration, direction) => {
  const available = ["W", "A", "S", "D"]
    .filter((candidate) => getDirectionAction(configuration, candidate));
  const grouped = new Map();

  for (const candidate of available) {
    const label = DIRECTION_ACTION_LABELS[configuration.state]?.[candidate] ?? "movimento";
    grouped.set(label, [...(grouped.get(label) ?? []), candidate]);
  }

  const guidance = grouped.size
    ? ` Ações disponíveis: ${[...grouped].map(([label, keys]) => `${keys.join("/")} — ${label}`).join("; ")}.`
    : " Nenhuma direção é válida com o topo atual da pilha.";
  return `Movimento não disponível em ${configuration.state} ao pressionar ${direction}. Nenhum símbolo foi consumido.${guidance}`;
};

export const getMovementPath = (fromState, toState) => {
  const fromRoom = physicalRoomByState[fromState];
  const toRoom = physicalRoomByState[toState];
  if (!fromRoom || !toRoom || fromRoom === toRoom) return [];

  const destination = {
    x: STATES_META[toState].x,
    y: STATES_META[toState].y + 10,
  };
  if (fromRoom === "q4" && toRoom === "q5") {
    return [{ x: 590, y: 115 }, destination];
  }

  return [destination];
};

export const appendMovementPath = (pendingWaypoints, newPath) => [
  ...pendingWaypoints,
  ...newPath,
];
