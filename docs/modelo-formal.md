# Modelo formal — Operação Cofre LIFO

## Definição

O jogo implementa o PDA determinístico e parcial

```text
M = (Q, Σ, Γ, δ, q0, Z, {qf})
Q = {q0, q1, q2, q3, q4, q5, q6, q7, q8, qf}
Σ = {i, c, k, v, p, d, s, f, m, r, l, e}
Γ = {Z, C, K, M}
```

`q0` é o estado inicial, `Z` é o símbolo inicial e base da pilha, e `qf` é o único estado final. Uma regra lê exatamente um símbolo da entrada e depende do estado atual e do topo da pilha: `δ(estado, leitura, topo) = (próximo estado, substituição do topo)`. A função é parcial; uma regra ausente rejeita a palavra. A aceitação exige consumir toda a entrada e terminar em `qf`.

A tabela completa de `δ` está na seção [Transições do PDA do README](../README.md#transições-do-pda). O motor JavaScript em `src/pda.js` é a fonte das regras; `scripts/generate-jflap.mjs` gera o XML JFLAP e `tests/jflap.test.js` exige que a representação versionada corresponda ao gerador e ao motor.

## Como a pilha reconhece a linguagem

O símbolo `C` representa a credencial C, `K` representa o kit K e `M` representa um malote. As operações de coleta empilham credenciais; no Portão, `q4 → q7 → q8` remove uma `C` e uma `K`, em qualquer ordem. `f` abre o cofre somente quando `Z` volta ao topo. Assim, um único recurso, a ordem incorreta ou recursos adicionais deixam uma transição necessária indisponível.

Cada `m` empilha `M`. A transição `r` só existe com `M` no topo, então exige ao menos um malote. Cada `l` desempilha um `M`; `e` só leva a `qf` quando `Z` está no topo. Portanto, todo malote coletado deve ser escondido antes da fuga.

Com `u₁ = icvkvpsdf` e `u₂ = ikvcvpdsf`, a linguagem reconhecida é:

```text
L = { u₁ mⁿ r lⁿ e | n ≥ 1 } ∪ { u₂ mⁿ r lⁿ e | n ≥ 1 }
```

Os dois prefixos codificam as duas ordens de coleta de C e K. A parte `mⁿ r lⁿ` exige quantidades iguais de malotes coletados e ocultados, com `n ≥ 1`.

### Por que a linguagem não é regular

Considere o conjunto regular `R = u₁ m* r l* e`. A interseção `L ∩ R` isola a primeira rota. Se `L` fosse regular, essa interseção também seria regular; removendo o prefixo fixo `u₁` e o sufixo fixo `e` por quocientes por palavras fixas, `{mⁿ r lⁿ | n ≥ 1}` também teria de ser regular.

Isso contradiz o lema do bombeamento: para comprimento de bombeamento `p`, a palavra `mᵖ r lᵖ` tem um prefixo bombeável formado apenas por `m`. Bombeá-lo altera a quantidade de `m` sem alterar a de `l`; o resultado deixa de pertencer à linguagem. Logo, `L` não é regular, e a pilha é necessária para comparar essas quantidades.

## Invariantes do modelo

1. `Z` permanece como base da pilha; todos os símbolos `C`, `K` e `M` são empilhados acima de `Z`.
2. Cada leitura usa somente `δ(estado, símbolo, topo)`; não há ação que ignore estado ou topo.
3. Uma transição inexistente não altera o estado nem a pilha; a palavra inteira é rejeitada.
4. `qf` é o único estado final, e só aceita após o consumo completo da entrada.
5. O segmento do Portão consome duas credenciais antes de `f`: uma `C` e uma `K`.
6. `r` requer pelo menos um `M`; `e` só é possível depois que todos os `M` forem removidos.
7. Não existe transição a partir de `qf`; qualquer símbolo restante impede a aceitação.

## Casos de aceitação e rejeição

Os 15 casos abaixo são cobertos pelos testes do motor. `ε` representa a entrada vazia.

| Entrada | Resultado | Motivo |
| --- | --- | --- |
| `icvkvpsdfmrle` | ACEITA | C e K nas duas fases do Portão; coleta e esconde um malote. |
| `ikvcvpdsfmmrlle` | ACEITA | Ordem inversa das credenciais; dois `m` e dois `l`. |
| `icvkvpsdfmmrlle` | ACEITA | Coleta e esconde dois malotes na primeira ordem de credenciais. |
| `icvpdfmrle` | REJEITA | Só coletou C; `f` não tem regra em `q4`. |
| `ikvpsfmrle` | REJEITA | Só coletou K; `f` não tem regra em `q4`. |
| `icvkvpdsfmrle` | REJEITA | No topo está K, mas `d` exige C na primeira trava. |
| `icvkvpsdfmmrle` | REJEITA | Empilhou dois `M`, mas escondeu apenas um; `e` encontra `M` no topo. |
| `icvkvpsdfrle` | REJEITA | `r` exige um `M`, mas nenhum malote foi coletado. |
| `icvkvpsdfmrlle` | REJEITA | Coletou um malote; o segundo `l` não tem regra depois que a pilha volta a `Z`. |
| `icvkvpsdfmrlee` | REJEITA | O primeiro `e` chega a `qf`; não há transição para o `e` restante. |
| `icvkvpsdfm` | REJEITA | A entrada termina no cofre, antes de `r`, `l` e `e`. |
| `icvkvcvpdsfmrle` | REJEITA | Três recursos foram coletados; depois de consumir C e K, sobra C e `f` exige `Z`. |
| `ε` | REJEITA | A execução permanece em `q0`, que não é final. |
| `i` | REJEITA | A entrada termina em `q1`, que não é final. |
| `xyz` | REJEITA | `x` não pertence a `Σ` e não há transição inicial para esse símbolo. |

## Estado formal e sala física

| Estado formal | Sala física exibida | Papel no jogo |
| --- | --- | --- |
| `q0` | Beco / Entrada | Início da invasão |
| `q1` | Saguão Central | Distribui os caminhos para Segurança, TI e Portão |
| `q2` | Sala de Segurança | Coleta C e retorna ao saguão |
| `q3` | Sala de TI | Coleta K e retorna ao saguão |
| `q4` | Portão Blindado | Aguarda a primeira credencial do topo |
| `q7` | Portão Blindado | Registra a primeira credencial consumida |
| `q8` | Portão Blindado | Registra a segunda credencial; `f` pode abrir o cofre |
| `q5` | Cofre | Coleta malotes e inicia a saída |
| `q6` | Corredor de Fuga | Esconde os malotes e conclui a fuga |
| `qf` | Garagem / Fuga | Único estado final |

`q4`, `q7` e `q8` são estados formais diferentes na mesma sala do mapa. A troca entre eles altera o monitor e a pilha, mas não cria uma sala física nem move o personagem.
