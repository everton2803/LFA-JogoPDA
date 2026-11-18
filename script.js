/**
 * Operação Cofre LIFO — Motor do Autômato de Pilha (PDA) + Jogo Interativo
 * Fiel ao arquivo assalto_banco_nao_linear_pda.jff (8 estados: q0..q6, qf)
 */

const STATES_META = {
  q0: { name: "Beco / Entrada", x: 75, y: 220, color: "#38bdf8" },
  q1: { name: "Saguão Central", x: 225, y: 220, color: "#38bdf8" },
  q2: { name: "Sala de Segurança", x: 225, y: 75, color: "#fbbf24" },
  q3: { name: "Sala de TI", x: 225, y: 365, color: "#a78bfa" },
  q4: { name: "Portão Blindado", x: 390, y: 220, color: "#38bdf8" },
  q5: { name: "Interior do Cofre", x: 525, y: 220, color: "#f472b6" },
  q6: { name: "Corredor de Fuga", x: 635, y: 220, color: "#38bdf8" },
  qf: { name: "Garagem (Fuga)", x: 715, y: 220, color: "#10b981" }
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
  stack: ["Z"], // índice length-1 é o TOPO
  tape: [],
  cursor: -1,
  status: "running", // "running" | "accepted" | "rejected"
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

/**
 * Processa um único símbolo no PDA.
 * @param {string} symbol - Caractere de entrada
 * @param {boolean} fromScript - Se veio da fita pré-digitada ou de ação WASD em tempo real
 */
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

  // Aplica pop e push (rule.push[0] fica no topo)
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

  // Verifica aceitação
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

// Execução de roteiro por texto (completo ou passo a passo)
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

// Botões dos 4 exemplos
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

/**
 * Navegação espacial via WASD mapeada diretamente às salas do PDA
 */
function handleDirection(dir) {
  if (autoTimer) return; // Evita conflito durante animação de roteiro
  if (pda.status === "rejected" || pda.status === "accepted") {
    showToast("Clique em Reiniciar (q₀) para iniciar uma nova tentativa.", true);
    return;
  }

  // Se o usuário estava no meio de um roteiro manual, limpa fila de texto
  scriptQueue = [];
  scriptIndex = 0;

  const st = pda.state;
  const top = getStackTop();
  let symbolToEmit = null;

  if (st === "q0") {
    if (dir === "D") symbolToEmit = "i";
    else showToast("Em q₀ (Beco), pressione D (Leste) para entrar no Saguão.");
  } else if (st === "q1") {
    if (dir === "W") symbolToEmit = "c";      // Norte -> Segurança (coleta C)
    else if (dir === "S") symbolToEmit = "k"; // Sul -> TI (coleta K)
    else if (dir === "D") symbolToEmit = "p"; // Leste -> Portão Blindado
    else showToast("No Saguão (q₁): W (Segurança), S (TI) ou D (Portão).");
  } else if (st === "q2") {
    if (dir === "S") symbolToEmit = "v";      // Sul -> volta ao Saguão
    else if (dir === "W") symbolToEmit = "c"; // Tenta pegar de novo (rejeita se não houver regra)
    else showToast("Na Sala de Segurança (q₂): pressione S para voltar ao Saguão.");
  } else if (st === "q3") {
    if (dir === "W") symbolToEmit = "v";      // Norte -> volta ao Saguão
    else showToast("Na Sala de TI (q₃): pressione W para voltar ao Saguão.");
  } else if (st === "q4") {
    if (dir === "W") symbolToEmit = "d";      // Desarma trava de Cartão (-C)
    else if (dir === "S") symbolToEmit = "s"; // Desarma trava de Kit (-K)
    else if (dir === "D") symbolToEmit = "f"; // Tenta abrir Cofre (exige topo Z)
    else showToast("No Portão (q₄): W (usar Cartão), S (usar Kit) ou D (abrir Cofre).");
  } else if (st === "q5") {
    if (dir === "W" || dir === "S") symbolToEmit = "m"; // Coleta malote (+M)
    else if (dir === "D") symbolToEmit = "r";           // Avança para Corredor de Fuga
    else showToast("No Cofre (q₅): W/S (pegar malote) ou D (Corredor de Fuga).");
  } else if (st === "q6") {
    if (dir === "W" || dir === "S") symbolToEmit = "l"; // Oculta malote (-M)
    else if (dir === "D") symbolToEmit = "e";           // Tenta escapar (exige topo Z)
    else showToast("No Corredor (q₆): W/S (ocultar malote) ou D (escapar na Garagem).");
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

// Atualização da Interface (HUD, Fita, Pilha, Log)
function updateUI(lastSymbol = null) {
  elState.textContent = pda.state;
  elStateName.textContent = STATES_META[pda.state].name;
  elSymbol.textContent = lastSymbol || "-";
  elSymbolDesc.textContent = lastSymbol ? (SYMBOL_DESC[lastSymbol] || "") : "Nenhum ainda";
  elStackTop.textContent = getStackTop() || "ε";

  // Banner de status
  elBanner.className = `status-banner ${pda.status}`;
  const titleEl = elBanner.querySelector(".status-title");
  if (pda.status === "accepted") titleEl.textContent = "✔ CADEIA ACEITA";
  else if (pda.status === "rejected") titleEl.textContent = "✖ CADEIA REJEITADA";
  else titleEl.textContent = "● EM EXECUÇÃO";
  elDetail.textContent = pda.statusMessage;

  // Fita
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

  // Pilha visual
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

  // Log
  elLog.innerHTML = pda.logs
    .map((item) => `<li class="${item.ok ? "ok" : "err"}">${item.text}</li>`)
    .join("");
}

// Renderização do Mapa no Canvas
function drawCorridor(x1, y1, x2, y2, label) {
  ctx.save();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  if (label) {
    ctx.setLineDash([]);
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 8);
  }
  ctx.restore();
}

function drawRoom(key, meta) {
  const isCurrent = pda.state === key;
  const w = 96;
  const h = 64;
  const rx = meta.x - w / 2;
  const ry = meta.y - h / 2;

  ctx.save();
  ctx.fillStyle = isCurrent ? "rgba(56, 189, 248, 0.16)" : "#0f172a";
  ctx.strokeStyle = isCurrent ? meta.color : "#334155";
  ctx.lineWidth = isCurrent ? 3 : 1.5;

  ctx.beginPath();
  ctx.roundRect(rx, ry, w, h, 10);
  ctx.fill();
  ctx.stroke();

  // Badge do estado
  ctx.fillStyle = meta.color;
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(key, meta.x, ry + 19);

  // Nome da sala
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "10px sans-serif";
  ctx.fillText(meta.name, meta.x, ry + 34);

  // Dica contextual dentro da sala
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px monospace";
  const hints = {
    q0: "[D] Entrar (i)",
    q1: "[W]Seg [S]TI [D]Portão",
    q2: "+Cartão C | [S]Voltar",
    q3: "+Kit K | [W]Voltar",
    q4: "[W]-C [S]-K [D]Cofre",
    q5: "[W]+M | [D]Fuga(r)",
    q6: "[W]-M | [D]Sair(e)",
    qf: "OBJETIVO FINAL"
  };
  ctx.fillText(hints[key] || "", meta.x, ry + 51);
  ctx.restore();
}

function renderLoop() {
  // Interpolação suave do agente
  pda.agentPos.x += (pda.targetPos.x - pda.agentPos.x) * 0.18;
  pda.agentPos.y += (pda.targetPos.y - pda.agentPos.y) * 0.18;

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
  drawCorridor(75, 220, 225, 220, "i");
  drawCorridor(225, 220, 225, 75, "c / v");
  drawCorridor(225, 220, 225, 365, "k / v");
  drawCorridor(225, 220, 390, 220, "p");
  drawCorridor(390, 220, 525, 220, "f (Z)");
  drawCorridor(525, 220, 635, 220, "r");
  drawCorridor(635, 220, 715, 220, "e (Z)");

  // Salas
  Object.entries(STATES_META).forEach(([key, meta]) => drawRoom(key, meta));

  // Personagem (Agente)
  ctx.save();
  ctx.fillStyle = pda.status === "rejected" ? "#ef4444" : "#38bdf8";
  ctx.beginPath();
  ctx.arc(pda.agentPos.x, pda.agentPos.y - 4, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#0f172a";
  ctx.stroke();

  // Visor do agente
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(pda.agentPos.x - 5, pda.agentPos.y - 7, 10, 4);
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

// Inicialização
populateDeltaTable();
resetPDA();
renderLoop();
