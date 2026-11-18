# Operação Cofre LIFO — Trabalho 02 (Autômato de Pilha / PDA)

Jogo web interativo desenvolvido para a disciplina de **Linguagens Formais e Autômatos (IFC)**, modelado a partir de um **Autômato de Pilha (PDA)** com 8 estados (`q0` a `qf`) e topologia não linear.

## Funcionalidades Implementadas
- **Motor Formal de PDA:** 100% sincronizado com o diagrama de estados criado no JFLAP (`assalto_banco_nao_linear_pda.jff`).
- **Controle em Tempo Real (WASD):** O deslocamento pelas alas do banco gera os símbolos de entrada dinamicamente e bloqueia/rejeita ações inválidas de acordo com o topo da pilha.
- **Execução por Roteiro (Cadeia de Entrada):** Permite digitar qualquer sequência de símbolos ou testar os **4 exemplos pré-configurados** (modo contínuo ou passo a passo).
- **Monitor em Tempo Real:** Exibe estado atual, símbolo lido, fita de entrada, pilha vertical (LIFO), log de transições `δ` e status final (**ACEITA** ou **REJEITADA**).
- **Diagrama JFLAP & Tabela `δ`:** Disponíveis diretamente na interface através do botão *Diagrama JFLAP & Regras δ*.

## Como Publicar no GitHub Pages
1. Envie os arquivos `index.html`, `style.css` e `script.js` para a raiz do seu repositório no GitHub.
2. Acesse **Settings → Pages** no repositório.
3. Em **Build and deployment → Branch**, selecione `main` e pasta `/ (root)`, depois clique em **Save**.
