/* ============================================================
   CONFIGURAÇÃO CENTRAL DAS FONTES DE DADOS  —  ÚNICO ARQUIVO A EDITAR
   ============================================================
   Fluxo:  Google Sheets → Apps Script → js/config.js → Dashboards

   Ordem de leitura de cada dashboard:
     1º  Apps Script (API_URL + ?s=<chave>)
     2º  CSV publicado (FALLBACK_CSV_URLS), na ordem da lista
   Uma resposta só é aceita se tiver as colunas esperadas pelo dashboard.
   Se a resposta for HTML, erro, vazia ou de outra aba, passa para a
   próxima fonte.

   Nenhum outro arquivo do projeto contém URL de dados.
   Aqui não há senhas nem chaves secretas (somente URLs públicas).
*/
window.TOZZO_CONFIG = {

  // URL do Apps Script (implantação "Aplicativo da Web", acesso "Qualquer pessoa").
  API_URL: 'https://script.google.com/macros/s/AKfycbz9Co_6jDe0XPRumB8lJOf7Ly8I8AoaDqxa-dIGQ66H7Hio0MI97JmYV6yVw8SSde-k/exec',

  // Chave enviada ao Apps Script como ?s=<chave>. Cada chave precisa existir
  // no objeto FONTES de apps-script/Code.gs (que define planilha e ABA).
  SOURCES: {
    cameras:    'cameras',     // aba "Resumo_Mensal"
    sensores:   'sensores',    // aba "Problemas"
    financeiro: 'financeiro',  // aba "Base"
    alertasgr:  'alertasgr',   // aba "Página1"
    ofensoresgestao: 'ofensoresgestao',   // aba "Página1" da planilha "Copia Ofensores Gestão"
    ofensoresmotoristas: 'ofensoresmotoristas'   // aba "Principal" da planilha "Ofensores na operação"
    // velocidade: lida direto do CSV publicado (FALLBACK_CSV_URLS.velocidade), sem passar pelo Apps Script
  },

  // Fontes reservas (CSV publicado). Só são usadas se o Apps Script falhar
  // ou devolver dados inválidos. Cada dashboard aceita mais de uma URL.
  FALLBACK_CSV_URLS: {
    cameras: [
      // NÃO CONFIRMADO — NECESSITA VALIDAÇÃO: link usado na versão antiga que funcionava.
      // Abra diagnostico.html no site publicado para comparar com a candidata abaixo.
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwU3HzIGYlOXqGWnbWItgi8Ahvfr5Mo6_nej-fJCfaPSTsaRvI4FVRwu4Vtlj-lyrJ4ah-3ftxG_HT/pub?output=csv'
    ],
    sensores: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5Ol_VsW5YrjksjhzRPrGIpyMvpdINrr-rPrwAjNovqdU7JVTtAqx3RVOkx5gy1PUgJ-3La4RXXpbo/pub?gid=0&single=true&output=csv'
    ],
    financeiro: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhNi6ukGGSsixv1TzyEN89Xnji8sZSvgehPvKzxIRE06x7CqjkyuRSNwaYOHVYpBkueYrpD6Xe2qkb/pub?output=csv'
    ],
    alertasgr: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRYKMDGnoqgPkM_JEuWhwq-1iSEaa_2i_AO1pjaixp9QsOSHqPymBwOsFr46w2dVC-x8BK4OHQ1bgYI/pub?gid=0&single=true&output=csv'
    ],
    // Ofensores Gestão: usa o Apps Script (planilha compartilhada "Copia Ofensores Gestão"); este CSV é a reserva.
    // NÃO CONFIRMADO: se este link publicado é da mesma planilha/aba (o painel só o aceita se tiver as colunas Gestor, Operação e Data).
    ofensoresgestao: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRsDkkikzUFgMc2-yAl3vFLmVwodS77BY7FmIQFHJ5jssg6dmF2tNSuUnpt6e7J_HoPLX00lxM9P2Ko/pub?gid=0&single=true&output=csv'
    ],
    // Ofensores Motoristas: usa o Apps Script (planilha compartilhada, aba "Principal"); este CSV publicado é só reserva.
    // NÃO CONFIRMADO: se este link publicado é da mesma planilha que o link compartilhado enviado em 06/10.
    ofensoresmotoristas: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2wruuE17DsLEMMBqrDe2ZYzWk-5NzhgFNuCPtFwBXPq9WOwYVzGTr8Hd6Dxuva-JhuLUH0BsztovQ/pub?gid=0&single=true&output=csv'
    ],
    // Velocidade Excedida: CSV publicado da planilha (link enviado em 06/10). O Google leva alguns minutos para refletir edições da planilha.
    velocidade: [
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vT2ZP1ITpGooUYrhfrD0XywN63Kw31JWT4jylFSiH_zsTgUquH60HKBotzIGYf79ckUyS2XEz8vXr30/pub?gid=0&single=true&output=csv'
    ]
  },

  // Candidatas que NÃO são usadas automaticamente (aparecem só em diagnostico.html).
  CANDIDATE_CSV_URLS: {
    cameras: [
      // Aba Resumo_Mensal (gid=1419508787). Estava no config.js anterior; não confirmada.
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ04q_bfpQiPF0vehIqieSEuQp2XTgSio4KZ-dr6eFUMClUqdS_PkfQQcXLYPova2HjhyeHHfgNLE8e/pub?gid=1419508787&single=true&output=csv'
    ]
  },

  // Atualização automática em milissegundos (0 = desligada). Atualiza só os
  // dados, sem recarregar a página, mantendo filtros e período.
  REFRESH_MS: {
    cameras:    600000,
    sensores:   600000,
    financeiro: 600000,
    alertasgr:  600000,
    ofensoresgestao:     600000,
    ofensoresmotoristas: 600000,
    velocidade: 600000
  },

  // Tempo máximo de espera por fonte, em milissegundos.
  TIMEOUT_MS: {
    cameras:    30000,
    sensores:   30000,
    financeiro: 30000,
    alertasgr:  90000,    // planilha grande (~10 MB)
    ofensoresgestao:     30000,
    ofensoresmotoristas: 30000,
    velocidade: 60000    // ~18 mil linhas (1,8 MB)
  },

  // Alertas GR: false = tipos de alerta fora da lista dos 17 ficam fora dos totais
  // (regra atual), mas são avisados na tela e no console.
  // true = entram nos dados com o rótulo "Tipo não reconhecido: <nome>".
  GR_INCLUIR_TIPOS_NAO_RECONHECIDOS: false,

  // Diagnóstico no console do navegador (Dashboard / Fonte / Status / Registros / Hora).
  DEBUG: true
};
