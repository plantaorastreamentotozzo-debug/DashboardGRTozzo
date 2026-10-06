/* ============================================================
   CAMADA DE DADOS — Esquadrão Tozzo
   Responsável por: buscar o CSV na fonte (config.js), validar,
   mostrar carregando/erro/vazio/incompleto e avisar o painel pai.
   Os painéis só chamam TozzoData.start(chave, {onData}) .
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.TOZZO_CONFIG || {}, states = {}, ov = null, toastEl = null;

  function norm(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function E(code, msg, detail) { var e = new Error(msg); e.code = code; e.detail = detail || ''; return e; }
  function ok(u) { return u && !/COLE_AQUI/i.test(u); }
  function hora() { return new Date().toLocaleTimeString('pt-BR'); }

  function per(v, key, dflt) { return (v && typeof v === 'object') ? (v[key] != null ? v[key] : dflt) : (v != null ? v : dflt); }
  function stamp(u) { return u + (u.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now(); }  // evita cache do navegador (não do Google)

  /* Ordem: 1º Apps Script, 2º CSVs reservas na ordem da lista. */
  function sources(key) {
    var l = [], s = (CFG.SOURCES || {})[key] || key, fb = (CFG.FALLBACK_CSV_URLS || {})[key] || [];
    if (typeof fb === 'string') fb = [fb];
    if (ok(CFG.API_URL) && (!CFG.SOURCES || CFG.SOURCES[key])) l.push({ kind: 'api', url: stamp(CFG.API_URL + (CFG.API_URL.indexOf('?') > -1 ? '&' : '?') + 's=' + encodeURIComponent(s)) });
    fb.forEach(function (u) { if (ok(u)) l.push({ kind: 'csv', url: stamp(u) }); });
    return l;
  }

  function log(key, fonte, status, regs) {
    if (!CFG.DEBUG || !window.console) return;
    console.info('[Tozzo]\nDashboard: ' + key + '\nFonte utilizada: ' + fonte + '\nStatus: ' + status +
      '\nQuantidade de registros: ' + (regs == null ? '-' : regs) + '\nData/hora da atualização: ' + new Date().toLocaleString('pt-BR'));
  }

  /* Baixa E valida cada fonte; só devolve uma resposta aceitável. */
  async function download(key, opts, st, skip) {
    var list = sources(key), last = null, tried = [];
    if (!list.length) throw E('NOT_CONFIGURED', 'A URL da fonte de dados ainda não foi configurada.');
    for (var i = skip || 0; i < list.length; i++) {
      var src = list[i], c = new AbortController(), id = setTimeout(function () { c.abort(); }, per(CFG.TIMEOUT_MS, key, 30000));
      var label = src.kind === 'api' ? 'Apps Script' : 'CSV publicado #' + i;
      try {
        if (i > (skip || 0) && st) st.onFallback && st.onFallback(label);
        var r = await fetch(src.url, { signal: c.signal, redirect: 'follow', cache: 'no-store' });
        if (!r.ok) throw E('HTTP', 'A fonte respondeu com erro ' + r.status + '.');
        var text = await r.text();
        if (/^\s*</.test(text)) throw E('INVALID', src.kind === 'api'
          ? 'A fonte devolveu uma página em vez dos dados. Confira se a implantação do Apps Script está com acesso "Qualquer pessoa".'
          : 'O link publicado devolveu uma página em vez dos dados. Confira se a planilha está publicada na web (Arquivo > Compartilhar > Publicar na web > CSV).');
        if (/^\s*ERRO:/i.test(text)) throw E('API', text.replace(/^\s*ERRO:\s*/i, ''));
        var info = validate(text, opts || {});          // colunas esperadas / vazio / aba errada
        log(key, label, 'OK (resposta válida)', info.rows);
        return { text: text, kind: src.kind, info: info, label: label, idx: i };
      } catch (e) {
        last = e.code ? e : E(e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
          e.name === 'AbortError' ? 'A fonte demorou demais para responder.' : 'Não foi possível conectar à fonte de dados. Verifique a internet e a URL configurada.',
          String(e && e.message || e));
        tried.push(label + ': ' + last.message);
        log(key, label, 'FALHOU - ' + last.message + (i < list.length - 1 ? ' (tentando fonte alternativa)' : ''), null);
      } finally { clearTimeout(id); }
    }
    last.tried = tried;
    throw last;
  }

  function splitLine(l) {
    var o = [], cur = '', q = false;
    for (var i = 0; i < l.length; i++) {
      var ch = l[i];
      if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { o.push(cur); cur = ''; } else cur += ch;
    }
    o.push(cur); return o;
  }

  function validate(text, opts) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== '' && !/^[,;\t\s]*$/.test(l); });   // ignora linhas vazias (só separadores), comuns no fim das planilhas
    if (lines.length < 2) throw E('EMPTY', 'A planilha está sem dados.');
    var info = { rows: lines.length - 1, warn: '' };
    var head = splitLine(lines[0]).map(norm);
    var find = function (n) { n = norm(n); return head.findIndex(function (h) { return h.indexOf(n) > -1; }); };
    var findAny = function (r) { return Array.isArray(r) ? r.some(function (x) { return find(x) > -1; }) : find(r) > -1; };
    if (opts.required && opts.required.length) {
      var miss = opts.required.filter(function (r) { return !findAny(r); }).map(function (r) { return Array.isArray(r) ? r[0] : r; });
      if (miss.length) throw E('INCOMPLETE', 'Dados incompletos: não encontrei as colunas ' + miss.join(', ') + '.');
    }
    (opts.warnBlank || []).forEach(function (n) {
      var ix = find(n); if (ix < 0) return;
      var s = lines.slice(1, 2001), v = s.filter(function (l) { return !String(splitLine(l)[ix] || '').trim(); }).length;
      if (v / s.length > 0.3) info.warn = 'Alguns registros estão incompletos (coluna "' + n + '" vazia em ' + Math.round(v / s.length * 100) + '% das linhas).';
    });
    return info;
  }

  /* ---------- interface (carregando / erro / vazio / aviso) ---------- */
  function css() {
    if (document.getElementById('tozzo-css')) return;
    var s = document.createElement('style'); s.id = 'tozzo-css';
    s.textContent = '#tozzo-ov{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#10241A;padding:24px;text-align:center}' +
      '#tozzo-ov.on{display:flex}#tozzo-ov .bx{max-width:480px}#tozzo-ov h3{margin:14px 0 6px;font-size:1.15rem;color:#007D3A}#tozzo-ov.err h3{color:#C62828}#tozzo-ov.warn h3{color:#B58900}' +
      '#tozzo-ov p{margin:0 0 14px;color:#587065;font-size:.95rem;line-height:1.45}#tozzo-ov small{display:block;color:#8a9a90;margin-bottom:14px}' +
      '#tozzo-ov button{background:#007D3A;color:#fff;border:0;border-radius:999px;padding:9px 22px;font:inherit;font-weight:600;cursor:pointer}' +
      '#tozzo-ov .sp{width:44px;height:44px;border:4px solid #CFE0D5;border-top-color:#007D3A;border-radius:50%;margin:0 auto;animation:tz 0.9s linear infinite}#tozzo-ov.err .sp,#tozzo-ov.warn .sp{display:none}@keyframes tz{to{transform:rotate(360deg)}}' +
      '#tozzo-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99998;background:#052A18;color:#fff;border-left:5px solid #C7D30A;border-radius:8px;padding:10px 16px;font:.85rem -apple-system,Segoe UI,Arial,sans-serif;display:none;max-width:92vw}#tozzo-toast.on{display:block}';
    document.head.appendChild(s);
  }
  function overlay(cls, title, msg, detail, retry) {
    css();
    if (!ov) { ov = document.createElement('div'); ov.id = 'tozzo-ov'; document.body.appendChild(ov); }
    ov.className = 'on ' + cls;
    ov.innerHTML = '<div class="bx"><div class="sp"></div><h3></h3><p></p><small></small></div>';
    ov.querySelector('h3').textContent = title; ov.querySelector('p').textContent = msg;
    var sm = ov.querySelector('small'); if (detail) sm.textContent = detail; else sm.remove();
    if (retry) { var b = document.createElement('button'); b.textContent = 'Tentar novamente'; b.onclick = retry; ov.querySelector('.bx').appendChild(b); }
  }
  function hideOverlay() { if (ov) ov.className = ''; }
  function toast(msg, ms) {
    css(); if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'tozzo-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = 'on'; clearTimeout(toastEl._t);
    if (ms !== 0) toastEl._t = setTimeout(function () { toastEl.className = ''; }, ms || 8000);
  }
  function notify(key, modo) { try { parent.postMessage({ tozzo: 2, painel: key, modo: modo, ts: Date.now() }, location.origin); } catch (e) { } }

  /* ---------- ciclo de carga ---------- */
  function dt(d) { return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  async function run(key, manual) {
    var st = states[key]; if (!st || st.busy) return; st.busy = true; clearTimeout(st.timer);
    if (!st.loaded) { overlay('', 'Carregando dados…', 'Buscando as informações na planilha. Isso pode levar alguns segundos.'); }
    else if (manual) toast('Atualizando dados…', 3000);
    notify(key, 'carregando');
    st.onFallback = function () {
      var m = 'Não foi possível atualizar os dados desta fonte. Tentando fonte alternativa…';
      if (!st.loaded) overlay('', 'Carregando dados…', m); else toast(m, 6000);
    };
    try {
      var res = null, skip = 0, parseErr = null;
      for (;;) {                                   // se a resposta é válida mas o painel não consegue interpretar, tenta a próxima fonte
        res = await download(key, st.opts, st, skip);
        try { await st.opts.onData(res.text, { kind: res.kind, rows: res.info.rows }); parseErr = null; break; }
        catch (e) {
          parseErr = E('PARSE', 'Os dados foram recebidos, mas não puderam ser interpretados.', String(e && e.message || e));
          log(key, res.label, 'ESTRUTURA INCOMPATÍVEL - ' + parseErr.detail, res.info.rows);
          skip = res.idx + 1; if (skip >= sources(key).length) throw parseErr;
        }
      }
      st.loaded = true; st.lastOk = new Date(); hideOverlay(); notify(key, res.kind === 'api' ? 'api' : 'csv');
      log(key, res.label, 'ATUALIZADO', res.info.rows);
      if (res.info.warn) toast(res.info.warn, 12000); else if (manual) toast('Dados atualizados às ' + hora(), 4000);
    } catch (e) {
      var retry = function () { run(key, true); }, det = (e.tried && e.tried.length ? e.tried.join(' | ') : e.detail);
      var ult = st.lastOk ? 'Última atualização disponível: ' + dt(st.lastOk) : 'Ainda não há atualização disponível nesta sessão.';
      if (!st.loaded) {
        if (e.code === 'EMPTY') { overlay('warn', 'Planilha sem dados', 'A fonte respondeu, mas não há linhas para exibir. Preencha a planilha e tente novamente.', det, retry); notify(key, 'vazio'); }
        else if (e.code === 'INCOMPLETE' || e.code === 'PARSE') { overlay('warn', 'Dados incompletos ou em formato inesperado', e.message, det, retry); notify(key, 'vazio'); }
        else if (e.code === 'NOT_CONFIGURED') { overlay('err', 'Fonte de dados não configurada', e.message + ' Edite o arquivo js/config.js e informe a URL do Google Apps Script.', '', null); notify(key, 'erro'); }
        else { overlay('err', 'Não foi possível atualizar os dados no momento.', e.message + ' ' + ult, det, retry); notify(key, 'erro'); }
      } else { toast('Não foi possível atualizar os dados no momento. ' + ult, 10000); notify(key, 'desatualizado'); }
      log(key, 'nenhuma', 'ERRO - ' + e.message, null);
    } finally {
      st.busy = false;
      var ms = per(CFG.REFRESH_MS, key, 0);
      if (st.opts.refresh !== false && ms > 0) st.timer = setTimeout(function () { run(key, false); }, ms);
    }
  }

  window.TozzoData = {
    start: function (key, opts) { states[key] = { opts: opts || {}, loaded: false, busy: false, timer: null, lastOk: null }; run(key, false); },
    reload: function (key) { run(key, true); }
  };
})();
