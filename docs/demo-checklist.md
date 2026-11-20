# Checklist de demonstração e entrega

## Preparação

- [ ] Executar `npm test` e confirmar todos os testes passando.
- [ ] Abrir a [versão publicada](https://everton2803.github.io/LFA-JogoPDA/) em uma aba anônima e conferir que ela carrega sem erros visíveis.
- [ ] Deixar o campo **Modo Roteiro**, os exemplos e o monitor do PDA visíveis para a apresentação.

## Demonstração do modelo

1. [ ] Executar `icvkvpsdfmrle` — deve mostrar **ACEITA**.
2. [ ] Executar `ikvcvpdsfmmrlle` — deve mostrar **ACEITA** e duas coletas/ocultações.
3. [ ] Executar `icvkvpdsfmrle` — deve mostrar **REJEITADA** por ordem incompatível com o topo da pilha no Portão.
4. [ ] Executar `icvkvpsdfmmrle` — deve mostrar **REJEITADA** porque um malote permanece na pilha.
5. [ ] Executar `icvpdfmrle` — deve mostrar **REJEITADA**: foi coletada somente a credencial C.
6. [ ] Executar `ikvpsfmrle` — deve mostrar **REJEITADA**: foi coletado somente o kit K.
7. [ ] Reiniciar e demonstrar todo o percurso por teclado: **D, W, S, S, W, D, S, W, D**. O monitor deve passar por `q4 → q7 → q8 → q5`; o personagem permanece na sala física do Portão durante `q4 → q7 → q8` e chega ao Cofre no fim.
8. [ ] Mostrar no monitor a pilha durante as credenciais e durante a coleta/ocultação dos malotes. Confirmar que ações inválidas não criam símbolos na fita.

## Verificação manual no JFLAP 7.1

- [ ] Abrir `assalto_banco_nao_linear_pda.xml` no JFLAP 7.1 e conferir os 10 estados e as 19 transições.
- [ ] Executar `icvkvpsdfmrle` e confirmar aceitação.
- [ ] Executar `icvpdfmrle` e confirmar rejeição.

**Esta etapa é manual:** a validação automatizada confere a equivalência do XML com o motor, mas não substitui abrir e executar o arquivo no JFLAP 7.1.

## Entrega no SIGAA

- [ ] Conferir a URL pública em aba anônima após o merge final: <https://everton2803.github.io/LFA-JogoPDA/>.
- [ ] Conferir que README, modelo formal, checklist e XML JFLAP estão no repositório.
- [ ] Enviar no SIGAA o link do GitHub Pages antes de **26/11/2026 às 23h59**.
- [ ] A dupla confirma que o link enviado abre e mostra a versão final.
