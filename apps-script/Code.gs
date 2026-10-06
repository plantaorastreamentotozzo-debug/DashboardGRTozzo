// Intermediário de dados - Esquadrão Tozzo (Google Apps Script)
// Implante como "Aplicativo da Web": Executar como "Eu", Acesso "Qualquer pessoa".
// Cada chave abaixo é usada pelo dashboard como ?s=<chave> (ver js/config.js > SOURCES).
//
// Cada fonte lê uma ABA ESPECÍFICA, pelo nome. Se a aba não existir, o script
// responde "ERRO: ..." (e NÃO lê outra aba por engano), e o dashboard passa
// para a fonte reserva.
//
// Nomes de aba confirmados nas planilhas reais (Google Drive):
//   Câmeras    -> "Resumo_Mensal"   (planilha "Copia Alertas Câmeras")
//   Sensores   -> "Problemas"       (planilha "Problema Sensor Rastreador")
//   Financeiro -> "Base"            (planilha "Dashboard Financeiro - GR")
//   Alertas GR -> "Página1"         (planilha "Cópia de ALERTAS ANGELLIRA")
//   Ofensores Gestão -> "Página1"   (planilha "Copia Ofensores Gestão")
//   Ofensores Motoristas -> "Principal"   (planilha "Ofensores na operação")
//   Velocidade Excedida -> "Velocidade"   (planilha "Velocidade Excedida")
// Se renomear uma aba na planilha, altere o nome aqui e implante uma nova versão.

const FONTES = {
  sensores:   { id: '1TxOQH-elTyRWz7jynCQWqDpMHLnE_qsUQ5rGK8frU2Y', aba: 'Problemas' },
  cameras:    { id: '17Y4pv_R-DgSKkQtL5JDEzs3iGwGnrqTJdwnVuykvjyw', aba: 'Resumo_Mensal' },
  financeiro: { id: '165y9hQZx1QxgdGuLDNGtS3UwElfTjZImj4mb5gjSPzg', aba: 'Base' },
  alertasgr:  { id: '1rmwllsJD5LYDxlGPaMbSWChsE0saPW1URA9CXCdYbm8', aba: 'Página1' },
  ofensoresgestao: { id: '1x1IksZeJnqxDyP1qNTEjNxxsYMDz-ziH3r6iqKBXta0', aba: 'Página1' },   // planilha "Copia Ofensores Gestão"
  ofensoresmotoristas: { id: '1Wm4QG1e4S4s_GOMuLjJpME558iQOWOBy8TrR8H92FMI', aba: 'Principal' },   // planilha "Ofensores na operação"
  velocidade: { id: '1U7cW2TKNNrEtrXNXBKVon_BVAAYDMXdUawySz3iMv3Y', aba: 'Velocidade' }   // planilha "Velocidade Excedida"
};

function doGet(e) {
  try {
    const chave = (e && e.parameter && e.parameter.s) || '';
    const f = FONTES[chave];
    if (!f) return texto('ERRO: fonte inválida. Use: ' + Object.keys(FONTES).join(', '));
    const planilha = SpreadsheetApp.openById(f.id);
    const aba = planilha.getSheetByName(f.aba);
    if (!aba) {
      const nomes = planilha.getSheets().map(function (s) { return s.getName(); }).join(', ');
      return texto('ERRO: aba "' + f.aba + '" não encontrada na planilha. Abas existentes: ' + nomes);
    }
    const v = aba.getDataRange().getDisplayValues();
    // descarta as linhas vazias do final (a aba de Alertas GR tem ~450 mil linhas em branco, que só pesam na resposta)
    while (v.length > 1 && v[v.length - 1].every(function (c) { return String(c).trim() === ''; })) v.pop();
    const csv = v.map(function (l) {
      return l.map(function (c) { c = String(c); return /[",\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\r\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
  } catch (err) {
    return texto('ERRO: ' + err.message);
  }
}
function texto(t) { return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT); }
