# Esquadrão Tozzo — Dashboard de Gerenciamento de Risco

Site estático (HTML/CSS/JS), pronto para o Vercel. Os dados **não ficam no código**:
são buscados em Google Sheets por meio de um Google Apps Script.

## Estrutura
- `index.html` — página inicial (menu com 4 painéis) e barra de status da fonte de dados.
- `panels/` — os 4 painéis (câmeras, sensores, financeiro, alertas GR), com layout e filtros originais.
- `js/config.js` — **ÚNICO arquivo para configurar a URL do Apps Script.**
- `js/data-source.js` — camada de dados: busca, validação, carregando, erros, planilha vazia, dados incompletos.
- `apps-script/Code.gs` — código do Apps Script que entrega as planilhas em CSV.
- `vercel.json` — cabeçalhos e cache. `assets/logo.png` — logo.

## Conectar a planilha real
1. Em script.google.com (conta dona das planilhas), crie um projeto e cole `apps-script/Code.gs`.
2. Confira os IDs das planilhas no objeto `FONTES` (chave = nome usado no dashboard).
3. Implantar > Nova implantação > Aplicativo da Web > Executar como "Eu" > Acesso "Qualquer pessoa".
4. Teste em janela anônima: `<URL>/exec?s=sensores` deve baixar um CSV.
5. Cole a URL `/exec` em `js/config.js` (`API_URL`).

## Publicar no Vercel
- Com GitHub: suba esta pasta e importe o repositório no Vercel (Framework: "Other", sem build).
- Ou pelo terminal: `npm i -g vercel` e, dentro da pasta, `vercel --prod`.
- Para trocar a URL depois: edite `js/config.js` e publique de novo.

## Comportamento
- Enquanto busca os dados: tela "Carregando dados…".
- Falha de conexão / servidor / URL ausente: mensagem de erro com botão "Tentar novamente".
- Planilha só com cabeçalho: "Planilha sem dados". Colunas obrigatórias ausentes: "Dados incompletos".
- Se uma atualização automática falhar, os últimos dados continuam na tela com um aviso.
- Atualização automática a cada 10 min (`REFRESH_MS`); Alertas GR atualiza ao abrir/recarregar.

## Padrão visual (Design System Transportes Tozzo)
- `css/tozzo-theme.css`: camada somente visual (paleta #0B5E3B, #2E7D4F, #A8D6A7, #EAF5EF, branco; fonte Inter) aplicada aos 4 painéis.
- `index.html`: menu lateral fixo (recolhível no celular). Nenhuma lógica de dados foi alterada.

## Página Inicial inteligente
Cada painel expõe `window.TozzoResumo(ini, fim)` (somente leitura, usa os dados e funções já carregados pelo painel). O `index.html` pré-carrega os 4 painéis e lê esse resumo; os cards não têm números nem nomes fixos. Filtro de período: campos De/Até + atalhos. Câmeras trabalha por mês completo.

## Fonte de dados (js/config.js)
Fluxo: Google Sheets → Apps Script → `js/config.js` → dashboards → GitHub → Vercel.
- Ordem de leitura: 1º Apps Script (`API_URL` + `?s=<chave>`), 2º CSVs publicados (`FALLBACK_CSV_URLS`). Uma resposta só é aceita se tiver as colunas esperadas; HTML, erro, vazio ou aba errada passam para a próxima fonte.
- `apps-script/Code.gs` lê cada fonte pela **aba** pelo nome (Resumo_Mensal, Problemas, Base, Página1). Depois de editar o Code.gs, implante uma **nova versão** do Apps Script.
- Atualização automática: `REFRESH_MS` (10 min), sem recarregar a página e mantendo filtros e período.
- Cache: o CSV publicado do Google tem cache próprio de alguns minutos; o Apps Script não.
- `diagnostico.html` (fora do menu) mostra o que cada fonte devolve (linhas, datas, cabeçalho).
- Console do navegador: cada leitura registra Dashboard / Fonte utilizada / Status / Quantidade de registros / Data/hora (`DEBUG`).
- Financeiro: a classificação manual de fornecedores fica salva só no navegador (localStorage) e não é compartilhada entre dispositivos.
- Alertas GR: tipos de alerta fora da lista dos 17 não entram nos totais, mas são avisados na tela e no console. Para incluí-los, use `GR_INCLUIR_TIPOS_NAO_RECONHECIDOS: true`.
