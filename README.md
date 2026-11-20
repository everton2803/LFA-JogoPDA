# Operação Cofre LIFO — Trabalho 02 de LFA

Jogo web interativo sobre uma equipe que invade um banco, coleta duas credenciais, abre um cofre e esconde todos os malotes antes da fuga. O motor é um **Autômato de Pilha (PDA)** determinístico e parcial; a pilha controla quais ações são possíveis e quando a execução é aceita.

[![CI](https://github.com/everton2803/LFA-JogoPDA/actions/workflows/ci.yml/badge.svg)](https://github.com/everton2803/LFA-JogoPDA/actions/workflows/ci.yml)
[![Demonstração](https://img.shields.io/badge/demo-GitHub%20Pages-0f766e?style=flat-square&logo=github)](https://everton2803.github.io/LFA-JogoPDA/)

## Contexto acadêmico

Este é o Trabalho 02 da disciplina **Linguagens Formais e Autômatos (LFA)**, baseado na aula 29 e em Autômatos de Pilha. A aplicação combina mapa, controles WASD, roteiro textual e monitor que mostra estado, símbolo lido, fita, pilha e transições executadas.

**Demonstração publicada:** [everton2803.github.io/LFA-JogoPDA](https://everton2803.github.io/LFA-JogoPDA/)

## Modelo formal

O modelo é `M = (Q, Σ, Γ, δ, q0, Z, {qf})`, com aceitação por estado final depois de consumir toda a entrada. A função `δ` é parcial e determinística: uma transição inexistente interrompe a execução e rejeita a palavra.

```text
Q = {q0, q1, q2, q3, q4, q5, q6, q7, q8, qf}
Σ = {i, c, k, v, p, d, s, f, m, r, l, e}
Γ = {Z, C, K, M}
q0 = estado inicial
Z  = símbolo inicial e base da pilha
F  = {qf}
```

Cada linha da tabela usa `δ(estado, entrada, topo) = (próximo estado, substituição do topo)`. `λ` significa que o símbolo do topo é removido sem substituição. No JavaScript o topo fica no fim do array; no campo `<push>` do JFLAP, o novo topo aparece à esquerda.

### Transições do PDA

| Estado | Entrada | Topo | Próximo estado | Substituição | Ação no jogo |
| --- | --- | --- | --- | --- | --- |
| q0 | i | Z | q1 | Z | Entra no saguão |
| q1 | c | Z | q2 | CZ | Coleta a credencial C |
| q1 | c | K | q2 | CK | Empilha C sobre K |
| q2 | v | C | q1 | C | Volta da Segurança |
| q1 | k | Z | q3 | KZ | Coleta o kit K |
| q1 | k | C | q3 | KC | Empilha K sobre C |
| q3 | v | K | q1 | K | Volta da TI |
| q1 | p | C | q4 | C | Avança ao Portão com C no topo |
| q1 | p | K | q4 | K | Avança ao Portão com K no topo |
| q4 | d | C | q7 | λ | Usa C na primeira trava |
| q4 | s | K | q7 | λ | Usa K na primeira trava |
| q7 | d | C | q8 | λ | Usa C na segunda trava |
| q7 | s | K | q8 | λ | Usa K na segunda trava |
| q8 | f | Z | q5 | Z | Abre o cofre após as duas credenciais |
| q5 | m | Z | q5 | MZ | Coleta o primeiro malote |
| q5 | m | M | q5 | MM | Coleta outro malote |
| q5 | r | M | q6 | M | Sai do cofre com pelo menos um malote |
| q6 | l | M | q6 | λ | Esconde e desempilha um malote |
| q6 | e | Z | qf | Z | Conclui a fuga sem malotes restantes |

`q7` e `q8` são fases formais dentro do Portão Blindado, não salas novas. O topo da pilha exige uma credencial `C` e uma `K`; depois das duas remoções, `f` só abre o cofre quando `Z` volta ao topo.

## Linguagem reconhecida

Definindo `u₁ = icvkvpsdf` e `u₂ = ikvcvpdsf`, a linguagem é:

```text
L = { u₁ mⁿ r lⁿ e | n ≥ 1 } ∪ { u₂ mⁿ r lⁿ e | n ≥ 1 }
```

As duas palavras iniciais representam a coleta das credenciais C e K em ordens diferentes. Cada `m` empilha um marcador `M`; cada `l` remove um. A fuga só termina com `Z` no topo, então deve haver pelo menos um malote e a quantidade de `m` precisa ser igual à quantidade de `l`.

Essa linguagem não é regular: isolando qualquer um dos prefixos fixos, a parte variável contém `{mⁿ r lⁿ | n ≥ 1}`. Se essa linguagem fosse regular, o lema do bombeamento permitiria bombear somente uma das duas sequências e quebraria a igualdade entre malotes coletados e escondidos.

## Como jogar e exemplos

Use `W`, `A`, `S` e `D` ou os botões na tela para mover o agente. No Portão, `W` apresenta C e `S` apresenta K; a ação só funciona quando a credencial correspondente está no topo da pilha. O agente fica no Portão até consumir as duas credenciais. Em `q8`, `D` abre o cofre. Também é possível inserir uma palavra no campo **Modo Roteiro** e executá-la inteira ou passo a passo.

| Palavra | Resultado | O que demonstra |
| --- | --- | --- |
| `icvkvpsdfmrle` | ACEITA | C antes de K; coleta e esconde um malote |
| `ikvcvpdsfmmrlle` | ACEITA | K antes de C; coleta e esconde dois malotes |
| `icvkvpdsfmrle` | REJEITADA | Ordem incompatível com o topo da pilha no Portão |
| `icvkvpsdfmmrle` | REJEITADA | Um dos dois malotes não foi escondido |

As regressões `icvpdfmrle` (só C) e `ikvpsfmrle` (só K) também são rejeitadas: ambas tentam abrir o cofre antes de consumir as duas credenciais.

## Desenvolvimento e testes

Requer Node.js. Na raiz do repositório:

```powershell
npm test
node scripts/generate-jflap.mjs
python -m http.server 4173
```

Abra <http://localhost:4173> no navegador. O jogo usa ES modules; abrir `index.html` por `file://` não funciona de forma confiável porque o navegador bloqueia a importação de módulos nesse contexto. O teste `npm test` verifica as transições, os invariantes, os 15 casos do plano, as palavras de demonstração, os controles e a equivalência do XML JFLAP com o gerador.

## Organização do repositório

- `index.html`, `style.css`, `script.js`: interface, estilos e ligação do jogo;
- `src/pda.js`: estados, alfabeto, pilha, regras `δ` e execução pura;
- `src/game-config.js`, `src/game-controls.js`: mapa físico, metadados e controles;
- `scripts/generate-jflap.mjs`: gera o XML JFLAP a partir de `src/pda.js`;
- `assalto_banco_nao_linear_pda.xml`: modelo para abrir no JFLAP;
- `tests/`: testes do PDA, interface, controles e representações.

## CI, GitHub Pages e JFLAP

A CI roda `npm test` em cada pull request e push, usando Node.js `26.13.1`. A página publicada fica em [GitHub Pages](https://everton2803.github.io/LFA-JogoPDA/); o merge em `main` atualiza a versão servida.

O arquivo [`assalto_banco_nao_linear_pda.xml`](assalto_banco_nao_linear_pda.xml) contém os mesmos 10 estados e 19 transições do motor. O gerador permite recriá-lo com `node scripts/generate-jflap.mjs`; o teste de equivalência falha se o XML versionado deixar de corresponder às regras. Para a conferência visual, abra o XML no **JFLAP 7.1** e execute `icvkvpsdfmrle` (aceita) e `icvpdfmrle` (rejeitada).

Para a defesa, consulte o [modelo formal e os casos de teste](docs/modelo-formal.md) e o [checklist de demonstração e entrega](docs/demo-checklist.md).

## Colaboradores

- **Thales Ferreira** ([@thalesfb](https://github.com/thalesfb)): extração do motor formal, testes e CI; correção do portão para exigir as duas credenciais.
- **Everton** ([@everton2803](https://github.com/everton2803)): controles e interface do jogo.
- **Thales e Everton**: documentação e preparação da entrega em conjunto.
