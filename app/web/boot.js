'use strict';
/* Inicializacao: navegacao, roteador, console, heartbeat e paleta de comandos */
(function () {
  var SN = window.SN, h = SN.h, $ = SN.$;

  var NAV = [
    ['Visão geral', ['dashboard']],
    ['Manutenção', ['optimize', 'repair', 'system', 'storage', 'cleaner', 'diskmap', 'programs']],
    ['Infraestrutura', ['network', 'machines', 'printers', 'users']],
    ['Segurança e diagnóstico', ['security', 'logs']],
    ['Ferramentas', ['terminal', 'unattend', 'shortcuts', 'reports', 'about']]
  ];
  var current = null;

  SN.go = function (id) { if (location.hash !== '#/' + id) location.hash = '#/' + id; else route(); };

  function buildNav() {
    var nav = SN.clear($('#nav'));
    NAV.forEach(function (g) {
      var box = h('div', { class: 'ng' }, h('div', { class: 'ng-l' }, g[0]));
      g[1].forEach(function (id) {
        var p = SN.pages[id]; if (!p) return;
        box.appendChild(h('button', { class: 'ni', 'data-id': id, title: p.title, onclick: function () { SN.go(id); } }, SN.icon(p.icon || 'info', 18), h('span', null, shortTitle(p))));
      });
      nav.appendChild(box);
    });
  }
  function shortTitle(p) { return p.nav || p.title.replace(/ e Debloat$/, '').replace(/^Terminal PowerShell$/, 'Terminal').replace(/^Logs e diagnóstico$/, 'Logs').replace(/^Atalhos do Windows$/, 'Atalhos').replace(/^Sobre e configurações$/, 'Sobre').replace(/^Autounattend.xml$/, 'Autounattend'); }

  function route() {
    var id = (location.hash.match(/^#\/([a-z]+)/) || [])[1];
    if (!SN.pages[id]) id = 'dashboard';
    var p = SN.pages[id];
    SN.runLeave();
    current = id;
    Array.prototype.forEach.call(document.querySelectorAll('.ni'), function (b) { b.classList.toggle('on', b.dataset.id === id); });
    $('#ttl').textContent = p.title; $('#sub').textContent = p.sub || '';
    document.title = p.title + ' · SnowToolkit';
    var view = SN.clear($('#view')); view.scrollTop = 0;
    try { p.render(view); }
    catch (e) { console.error(e); view.appendChild(SN.errBox('Erro ao montar a página: ' + e.message)); }
  }
  window.addEventListener('hashchange', route);

  // ---------- heartbeat e conexao ----------
  var fails = 0;
  function beat() {
    fetch('/api/ping').then(function (r) { if (!r.ok) throw 0; fails = 0; var c = $('#conn'); if (c) c.remove(); }).catch(function () {
      if (++fails >= 3 && !$('#conn')) document.body.appendChild(h('div', { id: 'conn' }, 'Conexão com o SnowToolkit perdida. Se o aplicativo foi fechado, abra-o novamente.'));
    });
  }

  // ---------- console ----------
  function wireDock() {
    $('#jobs-btn').addEventListener('click', function () { if (!SN.dock.jobs.length) return SN.toast('Nenhuma execução ainda. As saídas dos comandos aparecem aqui.'); SN.dock.toggle(); });
    $('#d-min').addEventListener('click', SN.dock.close);
    $('#d-cancel').addEventListener('click', function () { var j = SN.dock.active; if (j && !j.done) SN.api.post('/api/jobs/' + j.id + '/cancel').then(function () { SN.toast('Cancelando...', 'warn'); }); });
    $('#d-clear').addEventListener('click', function () { var j = SN.dock.active; if (j) { j.lines = []; SN.clear($('#dock-body')); } });
    var text = function () { var j = SN.dock.active; return j ? j.lines.map(function (l) { return l.t; }).join('\n') : ''; };
    $('#d-copy').addEventListener('click', function () { SN.copy(text(), 'Saída copiada'); });
    $('#d-save').addEventListener('click', function () { var j = SN.dock.active; if (j) SN.saveFile('saida_' + j.name.replace(/[^\w]+/g, '_').slice(0, 30) + '.txt', '﻿' + text()); });
    // redimensionar
    var grip = $('#grip');
    grip.addEventListener('mousedown', function (e) {
      e.preventDefault(); var startY = e.clientY, start = $('#dock').offsetHeight;
      function mv(ev) { var hh = Math.max(120, Math.min(window.innerHeight - 160, start + startY - ev.clientY)); document.documentElement.style.setProperty('--dock-h', hh + 'px'); }
      function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
  }

  // ---------- paleta de comandos ----------
  var palOpen = false;
  function paletteItems() {
    var items = [];
    Object.keys(SN.pages).forEach(function (id) { var p = SN.pages[id]; items.push({ label: p.title, hint: 'Página', run: function () { SN.go(id); } }); });
    [['Limpeza rápida', function () { SN.act({ id: 'cleanup', name: 'Limpeza rápida', params: { MODE: 'quick' } }); }], ['Reparo completo (DISM + SFC)', function () { SN.act({ id: 'repair', name: 'DISM + SFC', params: { WHAT: 'full' } }); }],
      ['Limpar cache DNS', function () { SN.act({ id: 'repair', name: 'Limpar DNS', params: { WHAT: 'dnsflush' } }); }], ['Reiniciar o Explorer', function () { SN.act({ id: 'repair', name: 'Reiniciar o Explorer', params: { WHAT: 'explorer' } }); }],
      ['Reiniciar fila de impressão', function () { SN.act({ id: 'repair', name: 'Spooler', params: { WHAT: 'spooler' } }); }], ['Criar ponto de restauração', function () { SN.act({ id: 'restore_point', name: 'Ponto de restauração', params: { NAME: 'SnowToolkit' } }); }],
      ['Gerar inventário HTML', function () { SN.act({ id: 'inventory', name: 'Inventário', params: { FORMAT: 'html' } }); }], ['Atualizar definições do Defender', function () { SN.act({ id: 'defender', name: 'Atualizar definições', params: { OP: 'update' } }); }],
      ['Atualizar todos os programas (winget)', function () { SN.act({ id: 'winget', name: 'Atualizar tudo', params: { OP: 'upgrade_all' } }); }]
    ].forEach(function (a) { items.push({ label: a[0], hint: 'Ação', run: a[1] }); });
    [['devmgmt', 'Gerenciador de dispositivos'], ['services', 'Serviços'], ['eventvwr', 'Visualizador de eventos'], ['diskmgmt', 'Gerenciamento de disco'], ['taskmgr', 'Gerenciador de tarefas'], ['regedit', 'Editor do Registro'], ['msinfo32', 'Informações do sistema'], ['ncpa', 'Conexões de rede'], ['gpedit', 'Política de grupo'], ['compmgmt', 'Gerenciamento do computador']]
      .forEach(function (t) { items.push({ label: t[1], hint: 'Abrir', run: function () { SN.launch(t[0]); } }); });
    (SN.store.get('machines', []) || []).forEach(function (m) { items.push({ label: 'RDP: ' + m.name, hint: m.host, run: function () { SN.act({ id: 'remote', name: 'RDP ' + m.name, params: { HOST: m.host, OP: 'rdp' } }); } }); });
    return items;
  }
  function palette() {
    if (palOpen) return; palOpen = true;
    var all = paletteItems(), shown = [], idx = 0;
    var input = h('input', { placeholder: 'Digite para buscar páginas, ações e ferramentas...', 'aria-label': 'Buscar comandos' }), ul = h('ul');
    var ov = h('div', { class: 'ov', style: { alignItems: 'flex-start', paddingTop: '12vh' } }, h('div', { class: 'pal' }, input, ul));
    function close() { palOpen = false; ov.remove(); document.removeEventListener('keydown', key, true); }
    function draw() {
      var q = input.value.toLowerCase().trim();
      shown = all.filter(function (i) { return !q || (i.label + ' ' + i.hint).toLowerCase().indexOf(q) >= 0; }).slice(0, 40);
      if (idx >= shown.length) idx = Math.max(0, shown.length - 1);
      SN.clear(ul);
      if (!shown.length) ul.appendChild(h('li', null, h('span', { class: 'muted' }, 'Nada encontrado')));
      shown.forEach(function (it, i) { ul.appendChild(h('li', { class: i === idx ? 'on' : '', onclick: function () { close(); it.run(); }, onmousemove: function () { if (idx !== i) { idx = i; draw(); } } }, it.label, h('small', null, it.hint))); });
      var on = ul.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest' });
    }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(shown.length - 1, idx + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); var it = shown[idx]; if (it) { close(); it.run(); } }
    }
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    input.addEventListener('input', function () { idx = 0; draw(); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(ov); draw(); input.focus();
  }
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
    else if (e.ctrlKey && e.key === '`') { e.preventDefault(); SN.dock.toggle(); }
  });

  // ---------- inicio ----------
  function start() {
    wireDock();
    SN.api.get('/api/about').then(function (a) {
      SN.about = a;
      $('#ver').textContent = 'v' + a.version + (a.demo ? ' · DEMO' : '');
      $('#admin-badge').appendChild(a.admin ? h('span', { class: 'badge ok' }, 'Administrador') : h('span', { class: 'badge warn', title: 'Execute como administrador para todas as funções' }, 'Sem privilégios de admin'));
    }).catch(function () { });
    SN.store.load().then(function () { buildNav(); route(); });
    setTimeout(function () { if (SN.checkUpdate) SN.checkUpdate(false); }, 4000);
    setInterval(beat, 4000); beat();
    window.addEventListener('error', function (e) { console.error('Erro na interface:', e.message); });
  }
  start();
})();
