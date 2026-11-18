/**
 * Operação Cofre LIFO — Motor do Autômato de Pilha (PDA) + Jogo Interativo
 * Fiel ao arquivo assalto_banco_nao_linear_pda.jff (8 estados: q0..q6, qf)
 */

// Layout em 4 colunas x 3 linhas (960x580) — salas grandes (184x104) e zero sobreposição
const STATES_META = {
  q0: { name: "Beco / Entrada",    x: 120, y: 290, color: "#38bdf8" },
  q2: { name: "Sala de Segurança", x: 355, y: 92,  color: "#fbbf24" },
  q1: { name: "Saguão Central",    x: 355, y: 290, color: "#38bdf8" },
  q3: { name: "Sala de TI",        x: 355, y: 488, color: "#a78bfa" },
  q4: { name: "Portão Blindado",   x: 595, y: 290, color: "#38bdf8" },
  q5: { name: "Interior do Cofre", x: 835, y: 110, color: "#f472b6" },
  q6: { name: "Corredor de Fuga",  x: 835, y: 290, color: "#38bdf8" },
  qf: { name: "Garagem (Fuga)",    x: 835, y: 470, color: "#10b981" }
};

const SYMBOL_DESC = {
  i: "Entrar no Saguão",
  c: "Clonar Cartão (+C)",
  k: "Coletar Kit TI (+K)",
  v: "Voltar ao Saguão",
  p: "Avançar ao Portão",
  d: "Usar Cartão (-C)",
  s: "Usar Kit TI (-K)",
  f: "Destravar Cofre (topo Z)",
  m: "Pegar Malote (+M)",
  r: "Ir p/ Corredor Fuga",
  l: "Ocultar Malote (-M)",
  e: "Escapar na Garagem (topo Z)"
};

// Tabela de Transições δ: (from, read, pop) -> { to, push, desc }
const TRANSITIONS = [
  { from: "q0", read: "i", pop: "Z", to: "q1", push: ["Z"], desc: "Infiltra o saguão principal" },
  { from: "q1", read: "c", pop: "Z", to: "q2", push: ["C", "Z"], desc: "Vai à Segurança e clona Cartão C" },
  { from: "q1", read: "c", pop: "K", to: "q2", push: ["C", "K"], desc: "Vai à Segurança e empilha Cartão C sobre K" },
  { from: "q2", read: "v", pop: "C", to: "q1", push: ["C"], desc: "Retorna da Segurança ao Saguão" },
  { from: "q1", read: "k", pop: "Z", to: "q3", push: ["K", "Z"], desc: "Vai à TI e coleta Kit K" },
  { from: "q1", read: "k", pop: "C", to: "q3", push: ["K", "C"], desc: "Vai à TI e empilha Kit K sobre C" },
  { from: "q3", read: "v", pop: "K", to: "q1", push: ["K"], desc: "Retorna da TI ao Saguão" },
  { from: "q1", read: "p", pop: "C", to: "q4", push: ["C"], desc: "Avança ao Portão Blindado com Cartão no topo" },
  { from: "q1", read: "p", pop: "K", to: "q4", push: ["K"], desc: "Avança ao Portão Blindado com Kit no topo" },
  { from: "q4", read: "d", pop: "C", to: "q4", push: [], desc: "Desarma leitor biométrico usando Cartão C (pop)" },
  { from: "q4", read: "s", pop: "K", to: "q4", push: [], desc: "Detona trava mecânica usando Kit K (pop)" },
  { from: "q4", read: "f", pop: "Z", to: "q5", push: ["Z"], desc: "Pilha limpa (Z): abre a porta do Cofre" },
  { from: "q5", read: "m", pop: "Z", to: "q5", push: ["M", "Z"], desc: "Coleta 1º malote de dinheiro (+M)" },
  { from: "q5", read: "m", pop: "M", to: "q5", push: ["M", "M"], desc: "Coleta malote adicional (+M)" },
  { from: "q5", read: "r", pop: "M", to: "q6", push: ["M"], desc: "Sai do Cofre para o Corredor de Fuga" },
  { from: "q6", read: "l", pop: "M", to: "q6", push: [], desc: "Oculta malote no fundo falso (pop M)" },
  { from: "q6", read: "e", pop: "Z", to: "qf", push: ["Z"], desc: "Todos malotes ocultos (Z): fuga concluída!" }
];

// Estado global da simulação
let pda = {
  state: "q0",
  stack: ["Z"],
  tape: [],
  cursor: -1,
  status: "running",
  statusMessage: "Aguardando entrada em q₀ (Beco / Entrada).",
  logs: [],
  agentPos: { x: STATES_META.q0.x, y: STATES_META.q0.y },
  targetPos: { x: STATES_META.q0.x, y: STATES_META.q0.y }
};

let autoTimer = null;

// Elementos DOM
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const elState = document.getElementById("current-state");
const elStateName = document.getElementById("current-state-name");
const elSymbol = document.getElementById("current-symbol");
const elSymbolDesc = document.getElementById("current-symbol-desc");
const elStackTop = document.getElementById("stack-top");
const elTape = document.getElementById("tape-container");
const elStack = document.getElementById("stack-container");
const elLog = document.getElementById("transition-log");
const elBanner = document.getElementById("status-banner");
const elDetail = document.getElementById("status-detail");
const elScriptInput = document.getElementById("script-input");
const elToast = document.getElementById("toast-feedback");

let toastTimeout = null;
function showToast(msg, isError = false) {
  elToast.textContent = msg;
  elToast.className = isError ? "toast error" : "toast";
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elToast.classList.add("hidden");
  }, 2600);
}

function getStackTop() {
  return pda.stack.length > 0 ? pda.stack[pda.stack.length - 1] : null;
}

function resetPDA(keepInput = true) {
  clearInterval(autoTimer);
  autoTimer = null;
  pda = {
    state: "q0",
    stack: ["Z"],
    tape: [],
    cursor: -1,
    status: "running",
    statusMessage: "Pronto em q₀. Mova com WASD ou execute um roteiro.",
    logs: [],
    agentPos: { x: STATES_META.q0.x, y: STATES_META.q0.y },
    targetPos: { x: STATES_META.q0.x, y: STATES_META.q0.y }
  };
  if (!keepInput) elScriptInput.value = "";
  updateUI();
}

function stepSymbol(symbol, fromScript = false) {
  if (pda.status === "rejected") {
    showToast("Execução já rejeitada. Reinicie para tentar novamente.", true);
    return false;
  }

  const top = getStackTop();
  if (!fromScript) {
    pda.tape.push(symbol);
    pda.cursor = pda.tape.length - 1;
  }

  const rule = TRANSITIONS.find(
    (t) => t.from === pda.state && t.read === symbol && t.pop === top
  );

  if (!rule) {
    pda.status = "rejected";
    const reason = `Sem transição δ(${pda.state}, '${symbol}', ${top || "ε"}).`;
    pda.statusMessage = `REJEITADA: ${reason}`;
    pda.logs.unshift({
      ok: false,
      text: `✖ REJEITADA em ${pda.state} lendo '${symbol}' com topo '${top || "ε"}'`
    });
    showToast(`Bloqueado! ${reason}`, true);
    updateUI(symbol);
    return false;
  }

  pda.stack.pop();
  for (let i = rule.push.length - 1; i >= 0; i--) {
    pda.stack.push(rule.push[i]);
  }

  const prevState = pda.state;
  pda.state = rule.to;
  pda.targetPos = { x: STATES_META[pda.state].x, y: STATES_META[pda.state].y };

  const pushedStr = rule.push.length ? rule.push.join("") : "λ";
  pda.logs.unshift({
    ok: true,
    text: `δ(${prevState}, ${symbol}, ${top}) → (${pda.state}, ${pushedStr}) • ${rule.desc}`
  });

  if (!fromScript) {
    if (pda.state === "qf") {
      pda.status = "accepted";
      pda.statusMessage = "ACEITA! O agente alcançou a Garagem (qf) com a pilha válida.";
      showToast("Missão cumprida! Sequência ACEITA pelo PDA.");
    } else {
      pda.status = "running";
      pda.statusMessage = `${rule.desc} (Estado atual: ${pda.state})`;
    }
  }

  updateUI(symbol);
  return true;
}

// Execução de roteiro por texto
let scriptQueue = [];
let scriptIndex = 0;

function prepareScript() {
  const raw = elScriptInput.value.trim().toLowerCase();
  if (!raw) {
    showToast("Digite ou selecione uma sequência de símbolos primeiro.", true);
    return false;
  }
  resetPDA(true);
  scriptQueue = raw.split("");
  scriptIndex = 0;
  pda.tape = [...scriptQueue];
  updateUI();
  return true;
}

function advanceScriptStep() {
  if (scriptIndex >= scriptQueue.length) {
    clearInterval(autoTimer);
    autoTimer = null;
    if (pda.status !== "rejected") {
      if (pda.state === "qf") {
        pda.status = "accepted";
        pda.statusMessage = "ACEITA! Toda a fita foi consumida e o autômato parou no estado final qf.";
      } else {
        pda.status = "rejected";
        pda.statusMessage = `REJEITADA! A fita terminou em ${pda.state}, que não é estado final (qf).`;
        pda.logs.unshift({
          ok: false,
          text: `✖ Fim da fita em ${pda.state} (esperado: qf)`
        });
      }
      updateUI();
    }
    return false;
  }

  const sym = scriptQueue[scriptIndex];
  pda.cursor = scriptIndex;
  scriptIndex++;
  const ok = stepSymbol(sym, true);

  if (!ok) {
    clearInterval(autoTimer);
    autoTimer = null;
    return false;
  }

  if (scriptIndex === scriptQueue.length) {
    clearInterval(autoTimer);
    autoTimer = null;
    if (pda.state === "qf") {
      pda.status = "accepted";
      pda.statusMessage = "ACEITA! Toda a fita foi consumida e o autômato alcançou qf.";
      showToast("Sequência ACEITA pelo PDA!");
    } else {
      pda.status = "rejected";
      pda.statusMessage = `REJEITADA! A entrada acabou em ${pda.state} (não atingiu qf).`;
      pda.logs.unshift({
        ok: false,
        text: `✖ Fim da entrada em ${pda.state} (não é estado final)`
      });
      showToast("Sequência REJEITADA: não chegou a qf.", true);
    }
    updateUI(sym);
  }
  return true;
}

document.getElementById("btn-run").addEventListener("click", () => {
  if (!prepareScript()) return;
  autoTimer = setInterval(() => {
    advanceScriptStep();
  }, 550);
});

document.getElementById("btn-step").addEventListener("click", () => {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
  if (scriptQueue.length === 0 || pda.cursor === -1 || pda.status !== "running") {
    if (!prepareScript()) return;
  }
  advanceScriptStep();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  scriptQueue = [];
  scriptIndex = 0;
  resetPDA(true);
});

document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const seq = btn.getAttribute("data-seq");
    elScriptInput.value = seq;
    if (prepareScript()) {
      autoTimer = setInterval(() => {
        advanceScriptStep();
      }, 500);
    }
  });
});

function handleDirection(dir) {
  if (autoTimer) return;
  if (pda.status === "rejected" || pda.status === "accepted") {
    showToast("Clique em Reiniciar (q₀) para iniciar uma nova tentativa.", true);
    return;
  }

  scriptQueue = [];
  scriptIndex = 0;

  const st = pda.state;
  let symbolToEmit = null;

  if (st === "q0") {
    if (dir === "D") symbolToEmit = "i";
    else showToast("Em q₀ (Beco), pressione D (Leste) para entrar no Saguão.");
  } else if (st === "q1") {
    if (dir === "W") symbolToEmit = "c";
    else if (dir === "S") symbolToEmit = "k";
    else if (dir === "D") symbolToEmit = "p";
    else showToast("No Saguão (q₁): W (Segurança), S (TI) ou D (Portão).");
  } else if (st === "q2") {
    if (dir === "S") symbolToEmit = "v";
    else if (dir === "W") symbolToEmit = "c";
    else showToast("Na Sala de Segurança (q₂): pressione S para voltar ao Saguão.");
  } else if (st === "q3") {
    if (dir === "W") symbolToEmit = "v";
    else showToast("Na Sala de TI (q₃): pressione W para voltar ao Saguão.");
  } else if (st === "q4") {
    if (dir === "W") symbolToEmit = "d";
    else if (dir === "S") symbolToEmit = "s";
    else if (dir === "D") symbolToEmit = "f";
    else showToast("No Portão (q₄): W (usar Cartão), S (usar Kit) ou D (abrir Cofre).");
  } else if (st === "q5") {
    if (dir === "A" || dir === "W") symbolToEmit = "m";
    else if (dir === "S" || dir === "D") symbolToEmit = "r";
    else showToast("No Cofre (q₅): W (pegar malote) ou S/D (Corredor de Fuga).");
  } else if (st === "q6") {
    if (dir === "A" || dir === "W") symbolToEmit = "l";
    else if (dir === "S" || dir === "D") symbolToEmit = "e";
    else showToast("No Corredor (q₆): W (ocultar malote) ou S/D (escapar na Garagem).");
  }

  if (symbolToEmit) {
    stepSymbol(symbolToEmit, false);
  }
}

document.addEventListener("keydown", (e) => {
  if (document.activeElement === elScriptInput) return;
  const key = e.key.toUpperCase();
  if (key === "W" || e.key === "ArrowUp") { e.preventDefault(); handleDirection("W"); }
  if (key === "A" || e.key === "ArrowLeft") { e.preventDefault(); handleDirection("A"); }
  if (key === "S" || e.key === "ArrowDown") { e.preventDefault(); handleDirection("S"); }
  if (key === "D" || e.key === "ArrowRight") { e.preventDefault(); handleDirection("D"); }
});

document.querySelectorAll(".key-btn").forEach((btn) => {
  btn.addEventListener("click", () => handleDirection(btn.getAttribute("data-dir")));
});

function updateUI(lastSymbol = null) {
  elState.textContent = pda.state;
  elStateName.textContent = STATES_META[pda.state].name;
  elSymbol.textContent = lastSymbol || "-";
  elSymbolDesc.textContent = lastSymbol ? (SYMBOL_DESC[lastSymbol] || "") : "Nenhum ainda";
  elStackTop.textContent = getStackTop() || "ε";

  elBanner.className = `status-banner ${pda.status}`;
  const titleEl = elBanner.querySelector(".status-title");
  if (pda.status === "accepted") titleEl.textContent = "✔ CADEIA ACEITA";
  else if (pda.status === "rejected") titleEl.textContent = "✖ CADEIA REJEITADA";
  else titleEl.textContent = "● EM EXECUÇÃO";
  elDetail.textContent = pda.statusMessage;

  if (pda.tape.length === 0) {
    elTape.innerHTML = `<span class="tape-empty">Nenhum símbolo processado</span>`;
  } else {
    elTape.innerHTML = pda.tape
      .map((ch, idx) => {
        let cls = "tape-cell";
        if (idx < pda.cursor) cls += " done";
        else if (idx === pda.cursor) {
          cls += pda.status === "rejected" ? " error" : " active";
        }
        return `<div class="${cls}">${ch}</div>`;
      })
      .join("");
  }

  elStack.innerHTML = pda.stack
    .map((sym, idx) => {
      const isTop = idx === pda.stack.length - 1;
      const topTag = isTop ? " ◀ TOPO" : "";
      if (sym === "Z") {
        return `<div class="stack-item base">Z <small>(Fundo)${topTag}</small></div>`;
      }
      return `<div class="stack-item sym-${sym}">${sym}${topTag}</div>`;
    })
    .join("");

  elLog.innerHTML = pda.logs
    .map((item) => `<li class="${item.ok ? "ok" : "err"}">${item.text}</li>`)
    .join("");
}

// Renderização do Mapa no Canvas (960x580 — salas grandes 184x104, zero sobreposição)
function drawCorridor(points, label, labelOffset = { x: 0, y: -14 }) {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  if (label) {
    ctx.setLineDash([]);
    const midIdx = Math.floor((points.length - 1) / 2);
    const mx = (points[midIdx].x + points[midIdx + 1].x) / 2 + labelOffset.x;
    const my = (points[midIdx].y + points[midIdx + 1].y) / 2 + labelOffset.y;

    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    const textW = ctx.measureText(label).width + 12;
    ctx.beginPath();
    ctx.roundRect(mx - textW / 2, my - 11, textW, 18, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, mx, my + 2);
  }
  ctx.restore();
}

function drawRoom(key, meta) {
  const isCurrent = pda.state === key;
  const w = 184;
  const h = 104;
  const rx = meta.x - w / 2;
  const ry = meta.y - h / 2;

  ctx.save();
  ctx.fillStyle = isCurrent ? "rgba(56, 189, 248, 0.16)" : "#0f172a";
  ctx.strokeStyle = isCurrent ? meta.color : "#334155";
  ctx.lineWidth = isCurrent ? 3.5 : 2;

  ctx.beginPath();
  ctx.roundRect(rx, ry, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // Cabeçalho interno da sala
  ctx.fillStyle = "rgba(30, 41, 59, 0.65)";
  ctx.beginPath();
  ctx.roundRect(rx + 2, ry + 2, w - 4, 28, [10, 10, 0, 0]);
  ctx.fill();

  // Badge do estado (canto superior esquerdo da sala)
  ctx.fillStyle = meta.color;
  ctx.font = "bold 15px monospace";
  ctx.textAlign = "left";
  ctx.fillText(key, rx + 12, ry + 21);

  // Nome da sala (centralizado e bem legível)
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(meta.name, meta.x, ry + 54);

  // Dica contextual na base da sala
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px monospace";
  const hints = {
    q0: "[D] Entrar (i)",
    q1: "[W]Seg  [S]TI  [D]Portão",
    q2: "+Cartão C  |  [S]Voltar",
    q3: "+Kit K  |  [W]Voltar",
    q4: "[W]-C  [S]-K  [D]Cofre",
    q5: "[W]+M  |  [S/D]Fuga(r)",
    q6: "[W]-M  |  [S/D]Sair(e)",
    qf: "OBJETIVO FINAL (ACEITA)"
  };
  ctx.fillText(hints[key] || "", meta.x, ry + 84);
  ctx.restore();
}

function renderLoop() {
  // Posiciona o agente no canto superior direito da sala alvo (sem tampar textos)
  const targetBadgeX = pda.targetPos.x + 68;
  const targetBadgeY = pda.targetPos.y - 36;
  pda.agentPos.x += (targetBadgeX - pda.agentPos.x) * 0.2;
  pda.agentPos.y += (targetBadgeY - pda.agentPos.y) * 0.2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid de fundo estilo planta arquitetônica
  ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Corredores conectando as salas
  drawCorridor([{ x: 120, y: 290 }, { x: 355, y: 290 }], "i", { x: 0, y: -18 });
  drawCorridor([{ x: 355, y: 290 }, { x: 355, y: 92 }], "c / v", { x: 34, y: 0 });
  drawCorridor([{ x: 355, y: 290 }, { x: 355, y: 488 }], "k / v", { x: 34, y: 0 });
  drawCorridor([{ x: 355, y: 290 }, { x: 595, y: 290 }], "p", { x: 0, y: -18 });
  // Portão (q4) -> Cofre (q5)
  drawCorridor([{ x: 595, y: 290 }, { x: 595, y: 110 }, { x: 835, y: 110 }], "f (Z)", { x: -32, y: 0 });
  // Cofre (q5) -> Corredor Fuga (q6)
  drawCorridor([{ x: 835, y: 110 }, { x: 835, y: 290 }], "r", { x: 26, y: 0 });
  // Corredor Fuga (q6) -> Garagem (qf)
  drawCorridor([{ x: 835, y: 290 }, { x: 835, y: 470 }], "e (Z)", { x: 34, y: 0 });

  // Salas
  Object.entries(STATES_META).forEach(([key, meta]) => drawRoom(key, meta));

  // Personagem (Agente) no canto superior direito da sala atual
  ctx.save();
  ctx.fillStyle = pda.status === "rejected" ? "#ef4444" : "#38bdf8";
  ctx.beginPath();
  ctx.arc(pda.agentPos.x, pda.agentPos.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0f172a";
  ctx.stroke();

  // Visor do agente
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(pda.agentPos.x - 5, pda.agentPos.y - 3, 10, 4);
  ctx.restore();

  requestAnimationFrame(renderLoop);
}

// Modal & Tabela Delta
const modal = document.getElementById("diagram-modal");
document.getElementById("btn-diagram").addEventListener("click", () => modal.classList.remove("hidden"));
document.getElementById("btn-close-modal").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

function populateDeltaTable() {
  const tbody = document.getElementById("delta-table-body");
  tbody.innerHTML = TRANSITIONS.map(
    (t) => `
    <tr>
      <td><strong>${t.from}</strong></td>
      <td><code>${t.read}</code></td>
      <td><code>${t.pop}</code></td>
      <td><strong>${t.to}</strong></td>
      <td><code>${t.push.length ? t.push.join("") : "λ (desempilha)"}</code></td>
      <td>${t.desc}</td>
    </tr>`
  ).join("");
}

populateDeltaTable();
resetPDA();
renderLoop();
