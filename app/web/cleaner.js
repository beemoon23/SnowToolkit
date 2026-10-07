'use strict';
/* SnowCleaner: limpeza guiada (varre primeiro, mostra quanto cada item ocupa, so apaga o que voce marcar). */
(function () {
  var SN = window.SN, h = SN.h;
  var GROUPS = ['Sistema', 'Navegadores', 'Aplicativos', 'Desenvolvimento'];
  var RISK = { safe: ['ok', 'Seguro'], medium: ['warn', 'Moderado'], careful: ['bad', 'Cuidado'] };
  var KEY = 'cleaner_sel';

  function bytesText(it) { return it.bytes < 0 ? 'variável' : SN.fmtBytes(it.bytes); }

  SN.page('cleaner', {
    title: 'Limpeza de arquivos', nav: 'Limpeza', sub: 'Veja o que ocupa espaço e apague só o que escolher', icon: 'trash',
    render: function (view) {
      var items = [], sel = new Set(), info = null, busy = false;
      var host = h('div'), summary = h('div');

      function saved() { var s = SN.store.get(KEY, null); return Array.isArray(s) ? s : null; }
      function persist() { SN.store.set(KEY, Array.from(sel)); }
      function selectable(it) { return !it.readonly; }
      function chosen() { return items.filter(function (i) { return sel.has(i.id) && selectable(i); }); }
      function chosenBytes() { return chosen().reduce(function (s, i) { return s + (i.bytes > 0 ? i.bytes : 0); }, 0); }

      function presetSafe() { sel = new Set(items.filter(function (i) { return selectable(i) && i.risk === 'safe'; }).map(function (i) { return i.id; })); }

      function drawSummary() {
        var n = chosen().length, b = chosenBytes();
        SN.clear(summary).appendChild(h('div', { class: 'row', style: { marginBottom: '12px' } },
          h('b', null, n ? n + ' item(ns) · ' + SN.fmtBytes(b) + ' para liberar' : 'Nada selecionado'),
          info && info.free ? h('span', { class: 'muted' }, 'Livre no disco do Windows: ' + SN.fmtBytes(info.free)) : null,
          h('span', { class: 'sp', style: { flex: 1 } }),
          h('button', { class: 'btn sm', onclick: function () { presetSafe(); persist(); draw(); } }, 'Só os seguros'),
          h('button', { class: 'btn sm', onclick: function () { sel = new Set(); persist(); draw(); } }, 'Limpar seleção'),
          h('button', { class: 'btn', disabled: !n, onclick: function () { run(true); } }, 'Simular'),
          h('button', { class: 'btn primary', disabled: !n, onclick: function () { run(false); } }, SN.icon('trash', 15), 'Limpar selecionados')));
      }

      function row(it) {
        var cb = h('input', { type: 'checkbox', checked: sel.has(it.id), disabled: !selectable(it), 'aria-label': it.label,
          onchange: function () { if (cb.checked) sel.add(it.id); else sel.delete(it.id); persist(); drawSummary(); } });
        var rk = RISK[it.risk] || RISK.safe;
        return h('div', { class: 'chk-i', style: { gridTemplateColumns: '22px minmax(0,1fr) auto' } },
          cb,
          h('div', null,
            h('div', { class: 'row', style: { gap: '8px' } }, h('b', null, it.label), h('span', { class: 'badge ' + rk[0] }, rk[1]),
              it.readonly ? h('span', { class: 'badge info' }, 'só informativo') : null,
              it.admin ? h('span', { class: 'badge' }, 'admin') : null),
            h('small', null, it.desc),
            it.running && it.running.length ? h('small', { style: { color: 'var(--warn)' } }, 'Aberto agora: ' + it.running.join(', ') + ' — feche para limpar tudo.') : null),
          h('div', { style: { textAlign: 'right', whiteSpace: 'nowrap' } },
            h('b', null, bytesText(it)),
            it.files ? h('small', null, it.files.toLocaleString('pt-BR') + ' arquivos') : null,
            it.readonly ? h('div', null, h('button', { class: 'btn sm', onclick: function () { SN.launch('cleanmgr'); } }, 'Limpeza de Disco')) : null));
      }

      function draw() {
        SN.clear(host);
        GROUPS.forEach(function (g) {
          var list = items.filter(function (i) { return i.group === g; });
          if (!list.length) return;
          var total = list.reduce(function (s, i) { return s + (i.bytes > 0 && !i.readonly ? i.bytes : 0); }, 0);
          host.appendChild(h('div', { style: { marginBottom: '14px' } }, SN.card(g, list.map(row), { right: h('span', { class: 'muted' }, SN.fmtBytes(total)) })));
        });
        if (!host.firstChild) host.appendChild(h('div', { class: 'muted' }, 'Nada para limpar foi encontrado.'));
        drawSummary();
      }

      function scan() {
        if (busy) return; busy = true;
        SN.clear(host).appendChild(SN.loading('Analisando o que dá para limpar (pode levar um ou dois minutos)...'));
        SN.clear(summary);
        SN.api.query('cleanscan', {}).then(function (d) {
          if (d.ok === false) throw new Error(d.error || 'Falha ao analisar');
          items = d.items || []; info = d;
          var s = saved();
          if (s) { var ids = new Set(items.map(function (i) { return i.id; })); sel = new Set(s.filter(function (x) { return ids.has(x); })); } else presetSafe();
          draw();
        }).catch(function (e) { SN.clear(host).appendChild(SN.errBox(e.message, function () { busy = false; scan(); })); }).then(function () { busy = false; });
      }

      function run(simulate) {
        var list = chosen(); if (!list.length) return;
        var risky = list.filter(function (i) { return i.risk !== 'safe'; });
        var body = (simulate ? 'Simulação: calcula o que seria apagado, sem remover nada.' : 'Serão apagados os arquivos dos itens abaixo (cerca de ' + SN.fmtBytes(chosenBytes()) + '). Isto não pode ser desfeito.');
        SN.act({
          id: 'cleanrun', name: simulate ? 'Simulação de limpeza' : 'Limpeza de arquivos',
          params: { IDS: list.map(function (i) { return i.id; }).join(','), SIM: simulate ? '1' : '0' },
          confirm: { title: simulate ? 'Simular limpeza' : 'Confirmar limpeza', body: body, list: list.map(function (i) { return i.label + ' — ' + bytesText(i); }), warn: !simulate && risky.length ? 'Inclui itens moderados/cuidado: ' + risky.map(function (i) { return i.label; }).join(', ') + '.' : null, danger: !simulate, ok: simulate ? 'Simular' : 'Limpar' }
        }).then(function (r) { if (r && !r.cancelled && !simulate) { busy = false; scan(); } });
      }

      view.append(
        h('div', { class: 'row', style: { marginBottom: '12px' } },
          h('button', { class: 'btn', onclick: function () { busy = false; scan(); } }, SN.icon('refresh', 15), 'Analisar de novo'),
          h('span', { class: 'faint' }, 'Nada é apagado até você confirmar. Senhas, cookies, histórico e documentos nunca entram na lista.')),
        summary, host);
      scan();
    }
  });
})();
