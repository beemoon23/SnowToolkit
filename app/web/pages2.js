'use strict';
/* Sistema, Discos, Programas */
(function () {
  var SN = window.SN, h = SN.h;
  var pctBar = function (v, max) { var p = Math.min(100, (v / (max || 100)) * 100); return h('div', { class: 'bar', style: { width: '90px' } }, h('i', { style: { width: p + '%' } })); };
  var stateBadge = function (v) { var ok = /running|ready|ok|healthy|up/i.test(v), bad = /stopped|disabled|fail|unhealthy|down/i.test(v); return h('span', { class: 'badge ' + (ok ? 'ok' : bad ? 'bad' : '') }, v == null ? '—' : v); };
  var infoModal = function (title, pairs) { SN.modal({ title: title, wide: true, body: [SN.kv(pairs)] }); };

  // ---- winget: interpreta a tabela de texto pelas posicoes das colunas do cabecalho
  SN.parseWinget = function (lines) {
    var hi = -1;
    for (var i = 0; i < lines.length; i++) { if (/^(Name|Nome)\s+(Id|ID)\b/.test(lines[i])) { hi = i; break; } }
    if (hi < 0) return [];
    var head = lines[hi], cols = [];
    ['Name', 'Nome', 'Id', 'ID', 'Version', 'Versão', 'Available', 'Disponível', 'Source', 'Origem'].forEach(function (k) {
      var m = new RegExp('(^|\\s)' + k + '(\\s|$)').exec(head); if (m) cols.push({ k: k, at: m.index + m[1].length });
    });
    cols.sort(function (a, b) { return a.at - b.at; });
    var key = { Name: 'name', Nome: 'name', Id: 'id', ID: 'id', Version: 'version', 'Versão': 'version', Available: 'available', 'Disponível': 'available', Source: 'source', Origem: 'source' };
    var out = [];
    for (var j = hi + 1; j < lines.length; j++) {
      var l = lines[j];
      if (!l || /^-+$/.test(l.trim()) || l.length < cols[1].at) continue;
      if (/^\d+\s/.test(l.trim()) && /(upgrade|atualiza)/i.test(l)) continue;
      var r = {};
      cols.forEach(function (c, ix) { r[key[c.k]] = l.slice(c.at, ix + 1 < cols.length ? cols[ix + 1].at : undefined).trim(); });
      if (r.id) out.push(r);
    }
    return out;
  };

  /* ================= SISTEMA ================= */
  SN.page('system', {
    title: 'Sistema', sub: 'Processos, serviços, inicialização, tarefas agendadas e energia', icon: 'cpu',
    render: function (view) {
      SN.tabs(view, [
        { id: 'proc', label: 'Processos', render: function (p) {
          SN.dataPage(p, {
            query: 'processes', auto: true,
            table: {
              exportName: 'processos', sortBy: 'memMB', desc: true, placeholder: 'Filtrar por nome, PID ou caminho...',
              cols: [
                { k: 'name', label: 'Processo', fmt: function (v, r) { return h('div', null, h('b', null, v), r.title ? h('div', { class: 'faint', style: { fontSize: '11.5px' } }, r.title) : null); } },
                { k: 'pid', label: 'PID', sort: 'num', cls: 'mono' },
                { k: 'cpu', label: 'CPU (s)', sort: 'num', fmt: function (v) { return v == null ? '—' : Number(v).toFixed(1); } },
                { k: 'memMB', label: 'Memória', sort: 'num', fmt: function (v) { return v >= 1024 ? (v / 1024).toFixed(2) + ' GB' : Math.round(v) + ' MB'; } },
                { k: 'threads', label: 'Threads', sort: 'num' },
                { k: 'path', label: 'Caminho', cls: 'mono', wrap: false }
              ],
              actions: function (r) {
                return [
                  { label: 'Encerrar', danger: true, run: function () { SN.act({ id: 'kill_process', name: 'Encerrar ' + r.name, params: { PID: String(r.pid), NAME: r.name }, confirm: { title: 'Encerrar processo', body: r.name + ' (PID ' + r.pid + ')', warn: 'Dados não salvos podem ser perdidos.', danger: true, ok: 'Encerrar' } }); } },
                  { label: 'Copiar caminho', run: function () { SN.copy(r.path || r.name); } },
                  { label: 'Detalhes', run: function () { infoModal(r.name, [['PID', r.pid], ['Memória', Math.round(r.memMB) + ' MB'], ['Threads', r.threads], ['Janela', r.title], ['Caminho', h('span', { class: 'mono' }, r.path)]]); } }
                ];
              }
            }
          });
        } },
        { id: 'svc', label: 'Serviços', render: function (p) {
          var svcAct = function (r, op, label, danger) {
            SN.act({ id: 'service', name: label + ' ' + r.name, params: { NAME: r.name, OP: op }, confirm: danger ? { title: label + ' serviço', body: (r.display || r.name) + ' (' + r.name + ')', danger: true, ok: label } : null }).then(function () { if (dp) dp.reload(true); });
          };
          var filt = { v: 'all' }, dp;
          var seg = h('div', { class: 'seg' });
          function drawSeg() { SN.clear(seg); [['all', 'Todos'], ['run', 'Em execução'], ['stop', 'Parados'], ['auto-stop', 'Automáticos parados']].forEach(function (o) { seg.appendChild(h('button', { class: filt.v === o[0] ? 'on' : '', onclick: function () { filt.v = o[0]; drawSeg(); dp.table() && dp.table().redraw(); } }, o[1])); }); }
          dp = SN.dataPage(p, {
            query: 'services', toolbar: function () { return seg; },
            table: {
              exportName: 'servicos', sortBy: 'display', placeholder: 'Filtrar serviços...',
              filter: function (r) { if (filt.v === 'run') return r.state === 'Running'; if (filt.v === 'stop') return r.state !== 'Running'; if (filt.v === 'auto-stop') return r.state !== 'Running' && /auto/i.test(r.start); return true; },
              cols: [
                { k: 'display', label: 'Serviço', fmt: function (v, r) { return h('div', null, h('b', null, v || r.name), h('div', { class: 'faint mono', style: { fontSize: '11.5px' } }, r.name)); } },
                { k: 'state', label: 'Estado', fmt: stateBadge }, { k: 'start', label: 'Inicialização' }, { k: 'account', label: 'Conta' }, { k: 'pid', label: 'PID', sort: 'num', cls: 'mono' }
              ],
              actions: function (r) {
                var run = r.state === 'Running';
                return [run ? { label: 'Parar', run: function () { svcAct(r, 'stop', 'Parar', true); } } : { label: 'Iniciar', run: function () { svcAct(r, 'start', 'Iniciar'); } },
                  { label: 'Reiniciar', run: function () { svcAct(r, 'restart', 'Reiniciar', true); } }, '-',
                  { label: 'Automático', run: function () { svcAct(r, 'auto', 'Automático'); } },
                  { label: 'Manual', run: function () { svcAct(r, 'manual', 'Manual'); } },
                  { label: 'Desabilitar', danger: true, run: function () { svcAct(r, 'disabled', 'Desabilitar', true); } }, '-',
                  { label: 'Copiar nome', run: function () { SN.copy(r.name); } }];
              }
            }
          });
          drawSeg();
        } },
        { id: 'startup', label: 'Inicialização', render: function (p) {
          SN.dataPage(p, {
            query: 'startup', note: 'Itens que iniciam com o Windows (Run/RunOnce/Pasta Inicializar). Para remover, abra o Registro no local indicado ou use o Gerenciador de Tarefas > Inicializar.',
            table: {
              exportName: 'inicializacao', cols: [{ k: 'name', label: 'Nome', fmt: function (v) { return h('b', null, v); } }, { k: 'command', label: 'Comando', cls: 'mono' }, { k: 'location', label: 'Local' }, { k: 'user', label: 'Usuário' }],
              actions: function (r) { return [{ label: 'Copiar comando', run: function () { SN.copy(r.command); } }, { label: 'Abrir Registro', run: function () { SN.launch('regedit'); } }, { label: 'Gerenc. de Tarefas', run: function () { SN.launch('taskmgr'); } }]; }
            }
          });
        } },
        { id: 'tasks', label: 'Tarefas agendadas', render: function (p) {
          var all = false, dp;
          var cb = h('input', { type: 'checkbox', onchange: function () { all = cb.checked; dp.reload(); } });
          var tk = function (r, op, lbl, danger) { SN.act({ id: 'task', name: lbl + ': ' + r.name, params: { NAME: r.name, PATH: r.path, OP: op }, confirm: danger ? { title: lbl + ' tarefa', body: r.name, danger: true, ok: lbl } : null }).then(function () { dp.reload(true); }); };
          dp = SN.dataPage(p, {
            query: 'tasks', params: function () { return { ALL: all ? '1' : '0' }; },
            toolbar: function () { return h('label', { class: 'chk' }, cb, 'Incluir tarefas da Microsoft'); },
            table: {
              exportName: 'tarefas', cols: [{ k: 'name', label: 'Tarefa', fmt: function (v) { return h('b', null, v); } }, { k: 'state', label: 'Estado', fmt: stateBadge }, { k: 'author', label: 'Autor' }, { k: 'command', label: 'Comando', cls: 'mono' }, { k: 'path', label: 'Pasta' }],
              actions: function (r) { return [{ label: 'Executar', run: function () { tk(r, 'run', 'Executar'); } }, r.state === 'Disabled' ? { label: 'Habilitar', run: function () { tk(r, 'enable', 'Habilitar'); } } : { label: 'Desabilitar', run: function () { tk(r, 'disable', 'Desabilitar', true); } }, { label: 'Excluir', danger: true, run: function () { tk(r, 'delete', 'Excluir', true); } }]; }
            }
          });
        } },
        { id: 'power', label: 'Energia', render: function (p) {
          var delay = h('input', { class: 'inp', type: 'number', min: 0, value: 0, style: { width: '100px' } });
          var pw = function (op, name, body, danger) { SN.act({ id: 'power', name: name, params: { OP: op, DELAY: String(delay.value || 0) }, confirm: { title: name, body: body, danger: danger, ok: name } }); };
          p.append(
            SN.card('Controle de energia deste computador', h('div', { class: 'stack' },
              h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Atraso (segundos):'), delay),
              h('div', { class: 'qa' }, [
                ['Reiniciar', 'restart', 'Reinicia o computador.', true], ['Desligar', 'shutdown', 'Desliga o computador.', true],
                ['Reiniciar para o firmware (BIOS/UEFI)', 'firmware', 'Reinicia direto nas configurações da BIOS.', true], ['Reiniciar em opções avançadas', 'advanced', 'Abre o menu de recuperação do Windows.', true],
                ['Encerrar sessão', 'logoff', 'Faz logoff do usuário atual.', true], ['Cancelar desligamento agendado', 'cancel', 'Cancela um desligamento/reinício pendente.', false]
              ].map(function (a) { return h('button', { onclick: function () { pw(a[1], a[0], a[2], a[3]); } }, h('b', null, a[0]), h('span', null, a[2])); })))),
            SN.card('Atalhos', h('div', { class: 'row' }, [['Opções de energia', 'powercfg'], ['Restauração do sistema', 'rstrui'], ['MSConfig', 'msconfig'], ['Propriedades do sistema', 'sysdm']].map(function (t) { return h('button', { class: 'tool-chip', onclick: function () { SN.launch(t[1]); } }, t[0]); }))));
          p.firstChild.style.marginBottom = '14px';
        } }
      ], 'system');
    }
  });

  /* ================= DISCOS ================= */
  SN.page('storage', {
    title: 'Discos', sub: 'Volumes, saúde SMART, maiores pastas e limpeza', icon: 'disk',
    render: function (view) {
      SN.tabs(view, [
        { id: 'vol', label: 'Volumes e saúde', render: function (p) {
          var box = h('div', null, SN.loading('Lendo discos...'));
          function load() {
            SN.api.query('disks').then(function (d) {
              SN.clear(box);
              box.appendChild(h('div', { class: 'grp-h' }, h('h4', null, 'Volumes')));
              box.appendChild(h('div', { class: 'g3' }, (d.volumes || []).map(function (v) {
                var used = v.sizeGB - v.freeGB, pc = v.sizeGB ? used / v.sizeGB * 100 : 0;
                return SN.card(null, h('div', { class: 'disk' }, h('div', { class: 'top' }, h('b', { style: { fontSize: '16px' } }, v.letter + ': ' + (v.label || '')), stateBadge(v.health || '—')),
                  h('div', { class: 'bar' + (pc > 92 ? ' bad' : pc > 80 ? ' warn' : '') }, h('i', { style: { width: pc.toFixed(1) + '%' } })),
                  h('div', { class: 'muted' }, v.freeGB + ' GB livres de ' + v.sizeGB + ' GB · ' + (v.fs || '') + ' · ' + (v.type || '')),
                  h('div', { class: 'row', style: { gap: '6px' } }, h('button', { class: 'btn sm', onclick: function () { SN.act({ id: 'repair', name: 'CHKDSK ' + v.letter + ' (leitura)', params: { WHAT: 'chkdsk_scan' } }); } }, 'Verificar'), h('button', { class: 'btn sm', onclick: function () { SN.launch('dfrgui'); } }, 'Otimizar'), h('button', { class: 'btn sm', title: 'Ver o que ocupa espaço nesta unidade', onclick: function () { SN.diskmapRoot = v.letter + ':\\'; SN.diskmapAuto = true; SN.go('diskmap'); } }, 'Mapa de espaço'))));
              })));
              box.appendChild(h('div', { class: 'grp-h' }, h('h4', null, 'Discos físicos (SMART)')));
              box.appendChild(SN.table({ search: false, exportName: 'discos', rows: d.physical || [], cols: [
                { k: 'name', label: 'Disco', fmt: function (v) { return h('b', null, v); } }, { k: 'media', label: 'Tipo' }, { k: 'bus', label: 'Barramento' }, { k: 'sizeGB', label: 'Tamanho', sort: 'num', fmt: function (v) { return v + ' GB'; } },
                { k: 'health', label: 'Saúde', fmt: stateBadge }, { k: 'temp', label: 'Temp.', sort: 'num', fmt: function (v) { return v == null ? '—' : v + ' °C'; } },
                { k: 'wear', label: 'Desgaste', sort: 'num', fmt: function (v) { return v == null ? '—' : v + '%'; } }, { k: 'hours', label: 'Horas ligado', sort: 'num', fmt: function (v) { return v == null ? '—' : v.toLocaleString('pt-BR') + ' h'; } },
                { k: 'readErr', label: 'Err. leitura', sort: 'num' }, { k: 'writeErr', label: 'Err. escrita', sort: 'num' }] }).el);
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, load)); });
          }
          p.appendChild(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), 'Atualizar'), h('button', { class: 'btn', onclick: function () { SN.launch('diskmgmt'); } }, 'Gerenciamento de disco')));
          p.appendChild(box); load();
        } },
        { id: 'big', label: 'Maiores pastas', render: function (p) {
          var trail = [], root = h('input', { class: 'inp', value: 'C:\\', style: { minWidth: '280px' }, 'aria-label': 'Pasta raiz' }), box = h('div'), busy = false;
          function scan(path) {
            if (busy) return; busy = true; root.value = path;
            SN.clear(box).appendChild(SN.loading('Medindo tamanhos em ' + path + ' (pode demorar alguns minutos em discos grandes)...'));
            SN.api.query('bigfolders', { PATH: path }).then(function (d) {
              if (d.ok === false) throw new Error(d.error || 'Falha ao medir');
              var items = d.items || [], total = items.reduce(function (s, i) { return s + i.bytes; }, 0), mx = Math.max.apply(null, items.map(function (i) { return i.bytes; }).concat([1]));
              var up = path.replace(/[\\\/]+$/, '').replace(/[\\\/][^\\\/]*$/, '');
              SN.clear(box).append(
                h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { class: 'muted' }, 'Total medido: ' + SN.fmtBytes(total)), /^[A-Za-z]:[\\\/].+/.test(path.replace(/[\\\/]+$/, '') + '\\') && path.replace(/[\\\/]+$/, '').length > 2 ? h('button', { class: 'btn sm', onclick: function () { scan(up.length <= 2 ? up + '\\' : up); } }, '\u2191 Subir') : null),
                SN.table({ exportName: 'maiores_pastas', rows: items, sortBy: 'bytes', desc: true, search: false, cols: [
                  { k: 'name', label: 'Item', fmt: function (v, r) { return h('b', null, (r.dir ? '\uD83D\uDCC1 ' : '\uD83D\uDCC4 ') + v); } },
                  { k: 'bytes', label: 'Tamanho', sort: 'num', fmt: function (v) { return SN.fmtBytes(v); } },
                  { label: '', sortable: false, fmt: function (v, r) { return h('div', { class: 'bar', style: { width: '160px' } }, h('i', { style: { width: (r.bytes / mx * 100).toFixed(1) + '%' } })); } }],
                  actions: function (r) { return [r.dir ? { label: 'Abrir', run: function () { busy = false; scan(r.path); } } : { label: 'Copiar caminho', run: function () { SN.copy(r.path); } }, { label: 'Copiar caminho', run: function () { SN.copy(r.path); } }]; }, onRow: function (r) { if (r.dir) { busy = false; scan(r.path); } } }).el);
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, function () { busy = false; scan(path); })); }).then(function () { busy = false; });
          }
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, root, h('button', { class: 'btn primary', onclick: function () { busy = false; scan(root.value.trim() || 'C:\\'); } }, SN.icon('search', 15), 'Analisar')), h('div', { class: 'note', style: { marginBottom: '10px' } }, 'Dê dois cliques numa pasta para entrar nela. A medição lê todos os arquivos e pode levar vários minutos.'), box);
        } },
        { id: 'clean', label: 'Limpeza', render: function (p) {
          var br = h('input', { type: 'checkbox' }), sim = h('input', { type: 'checkbox' });
          var go = function (mode) { SN.act({ id: 'cleanup', name: 'Limpeza ' + (mode === 'deep' ? 'profunda' : 'rápida'), params: { MODE: mode, BROWSERS: br.checked ? '1' : '0', SIM: sim.checked ? '1' : '0' }, confirm: { title: 'Limpeza ' + (mode === 'deep' ? 'profunda' : 'rápida'), body: sim.checked ? 'Simulação: apenas calcula o que seria liberado.' : (mode === 'deep' ? 'Remove temporários, caches, relatórios de erro, logs antigos, miniaturas, Windows Update e (opcionalmente) cache de navegadores.' : 'Remove temporários do usuário e do Windows, cache de atualização e esvazia a lixeira.'), ok: sim.checked ? 'Simular' : 'Limpar' } }); };
          p.append(h('div', { class: 'g2' },
            SN.card('Limpeza rápida', h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: 0 } }, 'Seguro para rodar a qualquer momento. Mostra quanto espaço foi liberado.'), h('div', null, h('button', { class: 'btn primary', onclick: function () { go('quick'); } }, SN.icon('trash', 15), 'Limpeza rápida')))),
            SN.card('Limpeza profunda', h('div', { class: 'stack' }, h('p', { class: 'muted', style: { margin: 0 } }, 'Inclui caches do sistema, relatórios de erro, miniaturas, logs e arquivos do Windows Update.'), h('div', null, h('button', { class: 'btn danger', onclick: function () { go('deep'); } }, SN.icon('trash', 15), 'Limpeza profunda')))),
            SN.card('Opções', h('div', { class: 'stack' }, h('label', { class: 'chk' }, br, 'Limpar cache de navegadores (Chrome, Edge, Firefox) — feche-os antes'), h('label', { class: 'chk' }, sim, 'Somente simular (não apaga nada)'))),
            SN.card('Ferramentas do Windows', h('div', { class: 'row' }, [['Limpeza de Disco', 'cleanmgr'], ['Desfragmentar/Otimizar', 'dfrgui'], ['Gerenciamento de disco', 'diskmgmt']].map(function (t) { return h('button', { class: 'tool-chip', onclick: function () { SN.launch(t[1]); } }, t[0]); })))));
        } }
      ], 'storage');
    }
  });

  /* ================= PROGRAMAS ================= */
  function wingetTable(host, o) {
    // o: {query, params(), ops:[{label,op,primary}], note, exportName}
    var out = h('div'), tbl = null, busy = false;
    var btnBar = h('div', { class: 'row', style: { marginBottom: '12px' } });
    var info = h('span', { class: 'faint' });
    function load() {
      if (busy) return; busy = true;
      SN.clear(out).appendChild(SN.loading(o.loading || 'Consultando o winget...'));
      SN.api.query(o.query, o.params ? o.params() : {}).then(function (d) {
        if (d.ok === false) throw new Error(d.error || 'winget indisponível');
        var rows = SN.parseWinget(d.lines || []);
        SN.clear(out);
        if (o.note) out.appendChild(h('div', { class: 'note', style: { marginBottom: '10px' } }, o.note));
        tbl = SN.table({
          rows: rows, selectable: true, exportName: o.exportName, empty: o.empty || 'Nada encontrado.', onSel: function (s) { info.textContent = s.length ? s.length + ' selecionado(s)' : ''; },
          cols: [{ k: 'name', label: 'Nome', fmt: function (v) { return h('b', null, v); } }, { k: 'id', label: 'ID', cls: 'mono' }, { k: 'version', label: 'Versão' }].concat(o.upgrade ? [{ k: 'available', label: 'Disponível', fmt: function (v) { return h('span', { class: 'badge info' }, v); } }] : []).concat([{ k: 'source', label: 'Origem' }]),
          actions: function (r) { return [{ label: o.upgrade ? 'Atualizar' : 'Instalar', run: function () { SN.act({ id: 'winget', name: (o.upgrade ? 'Atualizar ' : 'Instalar ') + r.name, params: { OP: o.upgrade ? 'upgrade' : 'install', IDS: r.id } }); } }, { label: 'Copiar ID', run: function () { SN.copy(r.id); } }]; }
        });
        out.appendChild(tbl.el);
      }).catch(function (e) { SN.clear(out).appendChild(SN.errBox(e.message, load)); }).then(function () { busy = false; });
    }
    function sel() { return tbl ? tbl.selected() : []; }
    btnBar.append(h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), o.reloadLabel || 'Atualizar lista'));
    (o.ops || []).forEach(function (op) {
      btnBar.appendChild(h('button', { class: 'btn' + (op.primary ? ' primary' : ''), onclick: function () {
        var s = op.all ? null : sel();
        if (!op.all && !s.length) return SN.toast('Selecione ao menos um item na tabela', 'warn');
        SN.act({ id: 'winget', name: op.label, params: { OP: op.op, IDS: op.all ? '' : s.map(function (r) { return r.id; }).join(',') }, confirm: { title: op.label, body: op.all ? 'Atualiza todos os programas com versão nova disponível.' : 'Itens: ' + s.map(function (r) { return r.name; }).join(', '), ok: 'Executar' } });
      } }, op.label));
    });
    btnBar.appendChild(info);
    host.append(btnBar, out);
    if (!o.manual) load();
    return { load: load };
  }

  SN.page('programs', {
    title: 'Programas', sub: 'Instalados, atualizações (winget), instalação em massa e apps da Store', icon: 'pkg',
    render: function (view) {
      SN.tabs(view, [
        { id: 'inst', label: 'Instalados', render: function (p) {
          var uninstall = function (r, quiet) {
            var cmd = quiet ? (r.quiet || r.uninstall) : r.uninstall;
            if (!cmd) return SN.toast('Este programa não informa comando de desinstalação', 'warn');
            SN.act({ id: 'uninstall', name: 'Desinstalar ' + r.name, params: { CMD: cmd, NAME: r.name }, confirm: { title: 'Desinstalar programa', body: r.name + ' ' + (r.version || ''), warn: quiet && !r.quiet ? 'Este programa não tem modo silencioso: o assistente de desinstalação pode abrir.' : null, danger: true, ok: 'Desinstalar' } });
          };
          SN.dataPage(p, {
            query: 'programs',
            table: {
              exportName: 'programas', sortBy: 'name', placeholder: 'Filtrar por nome ou fabricante...',
              cols: [{ k: 'name', label: 'Programa', fmt: function (v) { return h('b', null, v); } }, { k: 'version', label: 'Versão' }, { k: 'publisher', label: 'Fabricante' },
                { k: 'date', label: 'Instalado em', fmt: function (v) { return v && /^\d{8}$/.test(v) ? v.slice(6) + '/' + v.slice(4, 6) + '/' + v.slice(0, 4) : v; } },
                { k: 'sizeMB', label: 'Tamanho', sort: 'num', fmt: function (v) { return v ? Math.round(v) + ' MB' : '—'; } }],
              actions: function (r) { return [{ label: 'Desinstalar', danger: true, run: function () { uninstall(r, true); } }, { label: 'Desinstalar (assistente)', run: function () { uninstall(r, false); } }, { label: 'Copiar nome', run: function () { SN.copy(r.name); } }]; }
            }
          });
        } },
        { id: 'upd', label: 'Atualizações', render: function (p) {
          wingetTable(p, { query: 'winget_upgrades', upgrade: true, exportName: 'atualizacoes', empty: 'Tudo atualizado.', loading: 'Procurando atualizações (winget)...', ops: [{ label: 'Atualizar selecionados', op: 'upgrade', primary: true }, { label: 'Atualizar tudo', op: 'upgrade_all', all: true }] });
        } },
        { id: 'new', label: 'Instalar', render: function (p) {
          SN.tabs(p, [
            { id: 'cat', label: 'Catálogo', render: function (c) {
              // catalogo grande (SNOW_PKGS) + itens curados do SnowToolkit que nao estao nele
              var pk = (window.SNOW_PKGS || []).map(function (r) { return { cat: r[0], name: r[1], w: r[2], c: r[3] }; });
              var have = {}; pk.forEach(function (r) { if (r.w) have[r.w.toLowerCase()] = 1; });
              (window.SNOW_APPGROUPS || []).forEach(function (g) { g.apps.forEach(function (a) { if (!have[a[0].toLowerCase()]) pk.push({ cat: g.name, name: a[1], w: a[0], c: '' }); }); });
              var cats = []; pk.forEach(function (r) { if (cats.indexOf(r.cat) < 0) cats.push(r.cat); }); cats.sort();
              var mgr = SN.store.get('pkgMgr', 'winget'), q = '', sel = { winget: new Set(), choco: new Set() };
              var box = h('div'), cnt = h('span', { class: 'muted' });
              var mseg = h('div', { class: 'seg' }), search = h('input', { class: 'inp', type: 'search', placeholder: 'Buscar no catálogo (' + pk.length + ' apps)...', style: { minWidth: '280px' }, oninput: function () { q = search.value.toLowerCase(); draw(); } });
              var btn = h('button', { class: 'btn primary', onclick: install }, SN.icon('dl', 15), 'Instalar selecionados');
              function idOf(r) { return mgr === 'winget' ? r.w : r.c; }
              function drawSeg() { SN.clear(mseg); [['winget', 'winget'], ['choco', 'Chocolatey']].forEach(function (m) { mseg.appendChild(h('button', { class: mgr === m[0] ? 'on' : '', onclick: function () { mgr = m[0]; SN.store.set('pkgMgr', mgr); drawSeg(); draw(); upd(); } }, m[1])); }); }
              function upd() { var n = sel[mgr].size; cnt.textContent = n + ' selecionados (' + (mgr === 'winget' ? 'winget' : 'Chocolatey') + ')'; btn.disabled = !n; }
              function install() {
                var ids = Array.from(sel[mgr]); if (!ids.length) return;
                SN.act({ id: mgr === 'winget' ? 'winget' : 'choco', name: 'Instalar ' + ids.length + ' programas', params: { OP: 'install', IDS: ids.join(',') }, confirm: { title: 'Instalar programas (' + (mgr === 'winget' ? 'winget' : 'Chocolatey') + ')', list: ids, warn: mgr === 'choco' ? 'Se o Chocolatey não estiver instalado, ele será instalado primeiro.' : null, ok: 'Instalar' } });
              }
              function draw() {
                SN.clear(box); var shown = 0;
                cats.forEach(function (cat) {
                  var items = pk.filter(function (r) { return r.cat === cat && (!q || (r.name + ' ' + r.w + ' ' + r.c).toLowerCase().indexOf(q) >= 0); });
                  if (!items.length) return; shown += items.length;
                  var avail = items.filter(idOf);
                  box.appendChild(h('div', { class: 'grp-h' }, h('h4', null, cat + ' · ' + items.length), h('div', { class: 'row', style: { gap: '6px' } },
                    h('button', { class: 'btn sm ghost', onclick: function () { avail.forEach(function (r) { sel[mgr].add(idOf(r)); }); draw(); upd(); } }, 'Marcar grupo'),
                    h('button', { class: 'btn sm ghost', onclick: function () { items.forEach(function (r) { sel[mgr].delete(idOf(r)); }); draw(); upd(); } }, 'Limpar'))));
                  box.appendChild(h('div', { class: 'apps-grid' }, items.map(function (r) {
                    var id = idOf(r), cb = h('input', { type: 'checkbox', disabled: !id, checked: !!id && sel[mgr].has(id), onchange: function () { if (cb.checked) sel[mgr].add(id); else sel[mgr].delete(id); cb.closest('.opt').classList.toggle('on', cb.checked); upd(); } });
                    var d = h('div', { class: 'opt' + (id && sel[mgr].has(id) ? ' on' : ''), style: id ? null : { opacity: .45 } }, h('label', null, cb, h('span', { class: 't' }, h('b', null, r.name), h('small', null, id || 'indisponível no ' + (mgr === 'winget' ? 'winget' : 'Chocolatey')))));
                    return d;
                  })));
                });
                if (!shown) box.appendChild(h('div', { class: 'empty' }, 'Nada encontrado.'));
              }
              c.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { class: 'muted' }, 'Gerenciador:'), mseg, search), box,
                h('div', { class: 'actbar' }, cnt, h('span', { class: 'sp' }), h('button', { class: 'btn', onclick: function () { SN.act({ id: 'choco', name: 'Atualizar pacotes do Chocolatey', params: { OP: 'upgrade_all' } }); } }, 'Atualizar tudo (Chocolatey)'), btn));
              drawSeg(); draw(); upd();
            } },
            { id: 'search', label: 'Buscar no winget', render: function (c) {
              var q = h('input', { class: 'inp', placeholder: 'Nome do programa (ex.: vlc, anydesk, zoom)...', style: { minWidth: '320px' } });
              var holder = h('div'), w = null;
              function go() { var v = q.value.trim(); if (v.length < 2) return; SN.clear(holder); w = wingetTable(holder, { query: 'winget_search', params: function () { return { Q: v }; }, exportName: 'busca_winget', loading: 'Buscando "' + v + '"...', reloadLabel: 'Buscar de novo', ops: [{ label: 'Instalar selecionados', op: 'install', primary: true }] }); }
              q.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
              c.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, q, h('button', { class: 'btn primary', onclick: go }, SN.icon('search', 15), 'Buscar')), holder);
              q.focus();
            } }
          ], 'install');
        } },
        { id: 'store', label: 'Apps da Store', render: function (p) {
          var dp = SN.dataPage(p, {
            query: 'appx', toolbar: function () { return null; },
            table: {
              exportName: 'apps_store', selectable: true, sortBy: 'name', placeholder: 'Filtrar apps...', toolbar: [h('button', { class: 'btn danger sm', onclick: function () { rm(dp.table().selected()); } }, SN.icon('trash', 14), 'Remover selecionados')],
              cols: [{ k: 'name', label: 'Pacote', fmt: function (v) { return h('b', null, v); } }, { k: 'version', label: 'Versão' }, { k: 'publisher', label: 'Fabricante' }],
              actions: function (r) { return [{ label: 'Remover', danger: true, run: function () { rm([r]); } }]; }
            }
          });
          function rm(rows) {
            if (!rows.length) return SN.toast('Selecione ao menos um app', 'warn');
            SN.act({ id: 'appx_remove', name: 'Remover ' + rows.length + ' app(s) da Store', params: { FULL: rows.map(function (r) { return r.full; }).join('|') }, confirm: { title: 'Remover apps da Store', list: rows.map(function (r) { return r.name; }), warn: 'A remoção é para todos os usuários. Reinstale pela Microsoft Store se precisar.', danger: true, ok: 'Remover' } }).then(function () { dp.reload(true); });
          }
        } }
      ], 'programs');
    }
  });
})();
