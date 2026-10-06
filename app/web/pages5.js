'use strict';
/* Mapa de espaço em disco (estilo SpaceSniffer): blocos proporcionais ao tamanho, com navegação por pastas */
(function () {
  var SN = window.SN, h = SN.h;

  // cor de cada categoria de arquivo: [matiz, saturação]
  var CAT = [
    { n: 'Outros', hue: 252, sat: 14 }, { n: 'Vídeos', hue: 268, sat: 62 }, { n: 'Áudio', hue: 332, sat: 72 }, { n: 'Imagens', hue: 192, sat: 70 },
    { n: 'Documentos', hue: 216, sat: 78 }, { n: 'Compactados e imagens de disco', hue: 32, sat: 88 }, { n: 'Programas e sistema', hue: 352, sat: 78 }, { n: 'Código e dados', hue: 150, sat: 56 }
  ];
  function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x); }
  function catColor(c, name) { var k = CAT[c] || CAT[0]; return 'hsl(' + k.hue + ' ' + k.sat + '% ' + (40 + hash(name) % 13) + '%)'; }
  function fmtDate(sec) { return sec ? new Date(sec * 1000).toLocaleDateString('pt-BR') : '—'; }
  function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
  function fmtPct(p) { return p >= 10 ? p.toFixed(0) + '%' : p >= 1 ? p.toFixed(1) + '%' : p > 0 ? '<1%' : '0%'; }
  function fmtInt(n) { return (n || 0).toLocaleString('pt-BR'); }
  function fmtTime(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, 12) + '…' + s.slice(-(n - 13)) : s; }

  // treemap "squarified": distribui os itens (ordenados do maior para o menor) em retângulos quase quadrados
  function squarify(items, x, y, w, hgt) {
    var total = 0; items.forEach(function (it) { total += it.v; });
    if (!(total > 0) || w < 1 || hgt < 1) return;
    var k = w * hgt / total, i = 0;
    while (i < items.length) {
      var side = Math.min(w, hgt), sum = 0, mn = Infinity, mx = 0, best = Infinity, end = i;
      for (var j = i; j < items.length; j++) {
        var a = items[j].v * k, s2 = sum + a, mn2 = Math.min(mn, a), mx2 = Math.max(mx, a);
        var worst = Math.max(side * side * mx2 / (s2 * s2), s2 * s2 / (side * side * mn2));
        if (j > i && worst > best) break;
        sum = s2; mn = mn2; mx = mx2; best = worst; end = j + 1;
      }
      var q;
      if (w >= hgt) {
        var sw = sum / hgt, cy = y;
        for (q = i; q < end; q++) { var hh = items[q].v * k / sw; items[q].x = x; items[q].y = cy; items[q].w = sw; items[q].h = hh; cy += hh; }
        x += sw; w -= sw;
      } else {
        var sh = sum / w, cx = x;
        for (q = i; q < end; q++) { var ww = items[q].v * k / sh; items[q].x = cx; items[q].y = y; items[q].w = ww; items[q].h = sh; cx += ww; }
        y += sh; hgt -= sh;
      }
      i = end;
    }
  }

  var last = null; // análise mais recente (continua valendo ao sair e voltar para a página)

  SN.page('diskmap', {
    title: 'Mapa de espaço em disco', nav: 'Mapa de espaço', sub: 'Veja visualmente o que ocupa espaço, no estilo SpaceSniffer', icon: 'grid',
    render: function (view) {
      var st = { id: null, root: '', parts: [], data: null, sel: null, cat: null, q: '', depth: 3, timer: null, blocks: [], pendingSelect: null, status: null };
      var sepOf = function () { return st.root.indexOf('\\') >= 0 ? '\\' : '/'; };
      var pathOf = function (parts) { var r = st.root.replace(/[\\\/]+$/, ''); return parts.length ? r + sepOf() + parts.join(sepOf()) : st.root; };

      var rootInp = h('input', { class: 'inp', style: { minWidth: '260px', flex: '1 1 260px' }, 'aria-label': 'Pasta ou unidade', placeholder: 'C:\\  ou  \\\\servidor\\compartilhamento' });
      var volBox = h('span', { class: 'row', style: { gap: '6px' } });
      var goBtn = h('button', { class: 'btn primary' }, SN.icon('search', 15), 'Analisar');
      var stopBtn = h('button', { class: 'btn danger', style: { display: 'none' } }, 'Cancelar');
      var depthSel = h('select', { class: 'inp', 'aria-label': 'Níveis de pastas', title: 'Quantos níveis de pastas aparecem de uma vez' }, [2, 3, 4].map(function (n) { return h('option', { value: n, selected: n === 3 }, n + ' níveis'); }));
      var search = h('input', { class: 'inp', type: 'search', placeholder: 'Destacar por nome...', 'aria-label': 'Destacar por nome', style: { width: '170px' } });
      var csvBtn = h('button', { class: 'btn', disabled: true, title: 'Salva em CSV o nível que está na tela' }, SN.icon('dl', 15), 'Exportar CSV');

      var prog = h('div', { class: 'dm-prog', style: { display: 'none' } });
      var crumbs = h('div', { class: 'dm-crumbs' });
      var infoLine = h('div', { class: 'muted dm-info' });
      var tm = h('div', { class: 'tm', tabindex: 0, 'aria-label': 'Mapa de blocos proporcionais ao tamanho' });
      var tip = h('div', { class: 'tm-tip', style: { display: 'none' } });
      var empty = h('div', { class: 'dm-empty' });
      var side = h('aside', { class: 'dm-side' });
      var main = h('div', { class: 'dm-main' }, crumbs, infoLine, tm);
      var grid = h('div', { class: 'dm', style: { display: 'none' } }, main, side);

      view.append(
        h('div', { class: 'row', style: { marginBottom: '10px' } }, rootInp, goBtn, stopBtn, depthSel, search, csvBtn),
        h('div', { class: 'row', style: { marginBottom: '10px', gap: '8px' } }, h('span', { class: 'muted', style: { fontSize: '12.5px' } }, 'Unidades:'), volBox),
        prog, empty, grid, tip);

      empty.appendChild(SN.card('Como usar', h('div', { class: 'stack' },
        h('p', { class: 'muted', style: { margin: 0 } }, 'Escolha uma unidade ou pasta e clique em Analisar. Cada bloco é uma pasta ou arquivo, e a área dele é proporcional ao espaço que ocupa.'),
        h('ul', { class: 'muted', style: { margin: 0, paddingLeft: '18px', lineHeight: 1.7 } },
          h('li', null, 'Dois cliques numa pasta entram nela. Botão direito abre o menu (abrir no Explorer, copiar caminho).'),
          h('li', null, 'Backspace ou o botão "Subir" voltam um nível. A trilha no topo leva a qualquer nível anterior.'),
          h('li', null, 'Clique num tipo no painel à direita para destacar só aquele tipo de arquivo (vídeos, imagens...).'),
          h('li', null, 'A análise só lê o disco; nada é alterado nem apagado. Pastas do sistema só são lidas se o programa estiver como administrador.')),
        h('div', { class: 'note' }, 'Os tamanhos são os tamanhos lógicos dos arquivos. Arquivos que estão só na nuvem (OneDrive) não contam, pois não ocupam espaço local.'))));

      // ---- unidades ----
      SN.api.query('disks').then(function (d) {
        (d.volumes || []).forEach(function (v) {
          volBox.appendChild(h('button', { class: 'btn sm', title: (v.label || '') + ' · ' + v.freeGB + ' GB livres de ' + v.sizeGB + ' GB', onclick: function () { rootInp.value = v.letter + ':\\'; start(); } }, v.letter + ':'));
        });
      }).catch(function () { });

      // ---- análise ----
      function setBusy(b) { goBtn.disabled = b; stopBtn.style.display = b ? '' : 'none'; }
      function start() {
        var p = rootInp.value.trim();
        if (!p) { SN.toast('Informe uma unidade ou pasta.', 'warn'); return; }
        clearInterval(st.timer);
        st.id = null; st.parts = []; st.sel = null; st.cat = null; st.data = null;
        grid.style.display = 'none'; empty.style.display = 'none'; csvBtn.disabled = true;
        setBusy(true); showProg({ files: 0, dirs: 0, bytes: 0, seconds: 0, current: p });
        SN.api.post('/api/diskscan', { path: p }).then(function (r) {
          st.id = r.id; st.root = r.root; rootInp.value = r.root;
          SN.store.data.diskmapRoot = r.root; SN.store.save();
          last = { id: r.id, root: r.root, parts: [] };
          poll();
          st.timer = setInterval(poll, 600);
        }).catch(function (e) { setBusy(false); prog.style.display = 'none'; empty.style.display = ''; SN.toast(e.message, 'bad'); });
      }
      function showProg(s) {
        prog.style.display = '';
        SN.clear(prog).append(h('div', { class: 'spin' }),
          h('div', { style: { minWidth: 0, flex: 1 } },
            h('div', null, h('b', null, fmtInt(s.files)), ' arquivos · ', h('b', null, fmtInt(s.dirs)), ' pastas · ', h('b', null, SN.fmtBytes(s.bytes)), ' · ', fmtTime(s.seconds || 0)),
            h('div', { class: 'mono muted dm-cur' }, trunc(s.current || '', 110))));
      }
      function poll() {
        if (!st.id) return;
        SN.api.get('/api/diskscan/' + st.id).then(function (s) {
          if (s.state === 'scanning') { showProg(s); return; }
          clearInterval(st.timer); setBusy(false); prog.style.display = 'none';
          st.status = s;
          if (s.state === 'done') { navigate([]); }
          else { empty.style.display = ''; SN.toast(s.state === 'cancelled' ? 'Análise cancelada.' : 'A análise falhou.', 'warn'); }
        }).catch(function (e) { clearInterval(st.timer); setBusy(false); prog.style.display = 'none'; empty.style.display = ''; SN.toast(e.message, 'bad'); });
      }
      goBtn.addEventListener('click', start);
      rootInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
      stopBtn.addEventListener('click', function () { if (st.id) SN.api.post('/api/diskscan/' + st.id + '/cancel'); });
      depthSel.addEventListener('change', function () { st.depth = +depthSel.value; if (st.data) navigate(st.parts, true); });
      search.addEventListener('input', SN.debounce(function () { st.q = search.value.trim().toLowerCase(); applyFilter(); }, 120));

      // ---- navegação ----
      function navigate(parts, keepSel) {
        if (!st.id) return;
        var qs = 'depth=' + st.depth + parts.map(function (p) { return '&p=' + encodeURIComponent(p); }).join('');
        SN.api.get('/api/diskscan/' + st.id + '/tree?' + qs).then(function (d) {
          st.parts = parts; st.data = d; if (!keepSel) st.sel = null;
          if (last && last.id === st.id) last.parts = parts;
          empty.style.display = 'none'; grid.style.display = ''; csvBtn.disabled = false;
          drawAll();
          if (st.pendingSelect) { var b = st.blocks.filter(function (x) { return x.kind === 'file' && x.name === st.pendingSelect; })[0]; st.pendingSelect = null; if (b) select(b); }
        }).catch(function (e) { console.error(e); SN.toast((e && e.message) || 'Não foi possível montar o mapa.', 'bad'); });
      }
      function up() { if (st.parts.length) navigate(st.parts.slice(0, -1)); }

      function drawCrumbs() {
        SN.clear(crumbs);
        var rootName = st.root;
        crumbs.appendChild(h('button', { class: 'btn sm ghost', disabled: !st.parts.length, onclick: up, title: 'Subir um nível (Backspace)' }, '\u2191 Subir'));
        var items = [{ label: rootName, parts: [] }].concat(st.parts.map(function (p, i) { return { label: p, parts: st.parts.slice(0, i + 1) }; }));
        items.forEach(function (it, i) {
          if (i) crumbs.appendChild(h('span', { class: 'sep' }, '\u203A'));
          var cur = i === items.length - 1;
          crumbs.appendChild(h('button', { class: 'crumb' + (cur ? ' cur' : ''), onclick: function () { if (!cur) navigate(it.parts); } }, it.label));
        });
      }

      // ---- desenho do mapa ----
      function drawAll() {
        drawCrumbs();
        var n = st.data.node, s = st.status || {};
        SN.clear(infoLine).append(h('b', null, SN.fmtBytes(n.s)), ' em ' + fmtInt(n.f) + ' arquivos', ' · ' + pathOf(st.parts));
        if (s.denied) infoLine.appendChild(h('span', { class: 'badge warn', style: { marginLeft: '8px' }, title: 'O Windows negou a leitura. Abra o SnowToolkit como administrador para incluir essas pastas.' }, fmtInt(s.denied) + ' pastas sem acesso'));
        drawMap(); drawSide();
      }

      function drawMap() {
        SN.clear(tm); st.blocks = [];
        var W = tm.clientWidth, H = tm.clientHeight;
        if (W < 40 || H < 40) return;
        var n = st.data.node, frag = document.createDocumentFragment();

        function addBlock(b) { b.i = st.blocks.length; st.blocks.push(b); frag.appendChild(blockEl(b)); }

        function layoutChildren(node, parts, x, y, w, hh, depth) {
          var items = (node.k || []).map(function (k) { return { v: Math.max(k.s, 1), node: k }; });
          if (node.o && node.o.s > 0) items.push({ v: node.o.s, other: node.o });
          items.sort(function (a, b) { return b.v - a.v; });
          squarify(items, x, y, w, hh);
          items.forEach(function (it) {
            if (it.w < 1.5 || it.h < 1.5) return;
            if (it.other) { addBlock({ kind: 'other', name: fmtInt(it.other.f) + ' itens menores', size: it.other.s, files: it.other.f, x: it.x, y: it.y, w: it.w, h: it.h, depth: depth, parts: parts }); return; }
            var k = it.node, kp = parts.concat([k.n]);
            if (!k.d) { addBlock({ kind: 'file', name: k.n, size: k.s, files: 1, cat: k.c || 0, mtime: k.m, x: it.x, y: it.y, w: it.w, h: it.h, depth: depth, parts: kp, parent: node }); return; }
            var canNest = k.k && k.k.length && it.w >= 50 && it.h >= 34;
            if (!canNest) { addBlock({ kind: 'leaf', name: k.n, size: k.s, files: k.f, mtime: k.m, denied: k.x, x: it.x, y: it.y, w: it.w, h: it.h, depth: depth, parts: kp, parent: node }); return; }
            var hdr = it.h >= 46 && it.w >= 90 ? 17 : 0;
            addBlock({ kind: 'dir', name: k.n, size: k.s, files: k.f, mtime: k.m, hdr: hdr, x: it.x, y: it.y, w: it.w, h: it.h, depth: depth, parts: kp, parent: node });
            layoutChildren(k, kp, it.x + 1.5, it.y + 1.5 + hdr, it.w - 3, it.h - 3 - hdr, depth + 1);
          });
        }
        layoutChildren(n, st.parts, 0, 0, W, H, 0);
        tm.appendChild(frag);
        applyFilter();
      }

      function blockEl(b) {
        var el = h('div', { class: 'tm-b tm-' + b.kind, 'data-i': b.i });
        el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px';
        if (b.kind === 'file') el.style.background = catColor(b.cat, b.name);
        else if (b.kind === 'leaf') el.style.background = 'hsl(' + (258 + hash(b.name) % 30) + ' 34% ' + (27 + hash(b.name) % 8) + '%)';
        else if (b.kind === 'dir') el.style.background = 'rgba(185,169,255,' + Math.min(0.05 + b.depth * 0.025, 0.14) + ')';
        var showName = b.kind === 'dir' ? b.hdr > 0 : (b.w >= 54 && b.h >= 22);
        if (showName) {
          var t = h('span', { class: 'tm-t' }, (b.kind === 'dir' || b.kind === 'leaf' ? '' : '') + b.name);
          if (b.kind === 'dir') { el.appendChild(h('div', { class: 'tm-hd' }, t, h('span', { class: 'tm-s' }, SN.fmtBytes(b.size)))); }
          else { el.appendChild(t); if (b.h >= 40) el.appendChild(h('span', { class: 'tm-s' }, SN.fmtBytes(b.size))); }
        }
        b.el = el;
        return el;
      }

      // destaque por nome e por tipo
      function applyFilter() {
        var q = st.q, c = st.cat, active = q || c !== null;
        tm.classList.toggle('filtering', !!active);
        st.blocks.forEach(function (b) {
          var hit = true;
          if (q && b.name.toLowerCase().indexOf(q) < 0) hit = false;
          if (hit && c !== null && !(b.kind === 'file' && b.cat === c)) hit = false;
          if (b.kind === 'dir') hit = true; // moldura sempre visível
          b.el.classList.toggle('dim', active && !hit);
          b.el.classList.toggle('hit', !!active && hit && b.kind !== 'dir');
        });
      }

      // ---- seleção, dica flutuante e menu ----
      function typeOf(b) { return b.kind === 'file' ? CAT[b.cat || 0].n : b.kind === 'other' ? 'Itens menores agrupados' : 'Pasta'; }
      function select(b) {
        if (st.sel && st.sel.el) st.sel.el.classList.remove('sel');
        st.sel = b; if (b && b.el) b.el.classList.add('sel');
        drawSide();
      }
      function blockOf(e) { var el = e.target.closest ? e.target.closest('.tm-b') : null; return el ? st.blocks[+el.dataset.i] : null; }
      tm.addEventListener('mousemove', function (e) {
        var b = blockOf(e);
        if (!b) { tip.style.display = 'none'; return; }
        var total = st.data.node.s;
        var rows = [h('b', null, b.name)];
        if (b.kind !== 'other') rows.push(h('div', { class: 'mono muted' }, trunc(pathOf(b.parts), 70)));
        rows.push(h('div', null, SN.fmtBytes(b.size) + ' \u00b7 ' + fmtPct(pct(b.size, total)) + ' da pasta atual'));
        if (b.kind !== 'file') rows.push(h('div', { class: 'muted' }, fmtInt(b.files) + ' arquivos'));
        rows.push(h('div', { class: 'muted' }, typeOf(b) + (b.mtime ? ' \u00b7 ' + fmtDate(b.mtime) : '')));
        if (b.denied) rows.push(h('div', { style: { color: 'var(--warn)' } }, 'Sem permissão de leitura'));
        SN.clear(tip); rows.forEach(function (r) { tip.appendChild(r); });
        tip.style.display = '';
        var x = e.clientX + 14, y = e.clientY + 16;
        if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
        if (y + tip.offsetHeight > window.innerHeight - 8) y = e.clientY - tip.offsetHeight - 12;
        tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
      });
      tm.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
      tm.addEventListener('click', function (e) { var b = blockOf(e); if (b) select(b); });
      tm.addEventListener('dblclick', function (e) { var b = blockOf(e); if (b) open(b); });
      tm.addEventListener('contextmenu', function (e) {
        var b = blockOf(e); if (!b || b.kind === 'other') return;
        e.preventDefault(); select(b); tip.style.display = 'none';
        SN.menu({ getBoundingClientRect: function () { return { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }; } }, menuFor(b));
      });
      function open(b) {
        if (b.kind === 'dir' || b.kind === 'leaf') { if (b.denied && !b.size) { SN.toast('Esta pasta não pôde ser lida (sem permissão).', 'warn'); return; } navigate(b.parts); }
        else if (b.kind === 'file') reveal(b.parts);
      }
      function menuFor(b) {
        var m = [];
        if (b.kind === 'dir' || b.kind === 'leaf') m.push({ label: 'Entrar na pasta', run: function () { open(b); } });
        m.push({ label: 'Abrir no Explorer', run: function () { reveal(b.parts); } });
        m.push({ label: 'Copiar caminho', run: function () { SN.copy(pathOf(b.parts), 'Caminho copiado'); } });
        if (b.kind === 'dir' || b.kind === 'leaf') m.push('-', { label: 'Analisar só esta pasta de novo', run: function () { rootInp.value = pathOf(b.parts); start(); } });
        return m;
      }
      function reveal(parts) { SN.api.post('/api/diskscan/' + st.id + '/reveal', { parts: parts }).then(function (r) { if (r && r.demo) SN.toast('Modo demonstração: abriria ' + r.path); }).catch(function (e) { SN.toast(e.message, 'bad'); }); }

      // ---- painel lateral ----
      function drawSide() {
        SN.clear(side);
        var d = st.data; if (!d) return;
        var n = d.node, b = st.sel, total = n.s;
        // selecionado (ou pasta atual)
        var cur = b || { kind: 'dir', name: st.parts.length ? st.parts[st.parts.length - 1] : st.root, size: n.s, files: n.f, mtime: n.m, parts: st.parts };
        side.appendChild(SN.card(b ? 'Selecionado' : 'Pasta atual', h('div', { class: 'stack', style: { gap: '8px' } },
          h('div', { style: { fontWeight: 650, wordBreak: 'break-all' } }, cur.name),
          h('div', { class: 'mono muted', style: { wordBreak: 'break-all', fontSize: '12px' } }, cur.kind === 'other' ? '' : pathOf(cur.parts)),
          h('div', { class: 'dm-kv' },
            h('span', null, 'Tamanho'), h('b', null, SN.fmtBytes(cur.size)),
            b ? h('span', null, '% da pasta atual') : null, b ? h('b', null, fmtPct(pct(cur.size, total))) : null,
            cur.kind === 'file' ? null : h('span', null, 'Arquivos'), cur.kind === 'file' ? null : h('b', null, fmtInt(cur.files)),
            h('span', null, 'Tipo'), h('b', null, typeOf(cur)),
            h('span', null, 'Modificado'), h('b', null, fmtDate(cur.mtime))),
          cur.kind === 'other' ? null : h('div', { class: 'row', style: { gap: '6px' } },
            (cur.kind === 'dir' || cur.kind === 'leaf') && b ? h('button', { class: 'btn sm primary', onclick: function () { open(cur); } }, 'Entrar') : null,
            h('button', { class: 'btn sm', onclick: function () { reveal(cur.parts); } }, 'Abrir no Explorer'),
            h('button', { class: 'btn sm', onclick: function () { SN.copy(pathOf(cur.parts), 'Caminho copiado'); } }, 'Copiar caminho')))));
        // por tipo
        var cats = (d.cats || []).slice().sort(function (a, b2) { return b2.s - a.s; });
        var catsTotal = cats.reduce(function (s, c) { return s + c.s; }, 0);
        side.appendChild(SN.card('Por tipo de arquivo', h('div', { class: 'dm-cats' }, cats.map(function (c) {
          return h('button', { class: 'dm-cat' + (st.cat === c.c ? ' on' : ''), title: 'Destacar só ' + c.name.toLowerCase(), onclick: function () { st.cat = st.cat === c.c ? null : c.c; drawSide(); applyFilter(); } },
            h('i', { style: { background: 'hsl(' + CAT[c.c].hue + ' ' + CAT[c.c].sat + '% 48%)' } }),
            h('span', { class: 'nm' }, c.name), h('span', { class: 'sz' }, SN.fmtBytes(c.s) + ' · ' + fmtPct(pct(c.s, catsTotal))));
        }))));
        // maiores arquivos
        var top = d.top || [];
        if (top.length) side.appendChild(SN.card('Maiores arquivos aqui', h('div', { class: 'dm-top' }, top.map(function (f) {
          var name = f.p[f.p.length - 1], dir = f.p.slice(0, -1);
          return h('button', { class: 'dm-tf', title: pathOf(f.p), onclick: function () { st.pendingSelect = name; navigate(dir, true); } },
            h('i', { style: { background: catColor(f.c, name) } }), h('span', { class: 'nm' }, name), h('span', { class: 'sz' }, SN.fmtBytes(f.s)), h('span', { class: 'dr' }, trunc(dir.length ? dir.join(sepOf()) : st.root, 38)));
        }))));
      }

      // ---- exportar ----
      csvBtn.addEventListener('click', function () {
        if (!st.data) return;
        var n = st.data.node, rows = [['Tipo', 'Nome', 'Caminho', 'Tamanho (bytes)', 'Tamanho', '% da pasta', 'Arquivos', 'Modificado']];
        (n.k || []).forEach(function (k) { rows.push([k.d ? 'Pasta' : CAT[k.c || 0].n, k.n, pathOf(st.parts.concat([k.n])), k.s, SN.fmtBytes(k.s), pct(k.s, n.s).toFixed(2), k.f, k.m ? new Date(k.m * 1000).toISOString().slice(0, 10) : '']); });
        if (n.o) rows.push(['Agrupado', fmtInt(n.o.f) + ' itens menores', '', n.o.s, SN.fmtBytes(n.o.s), pct(n.o.s, n.s).toFixed(2), n.o.f, '']);
        var csv = rows.map(function (r) { return r.map(function (c) { c = String(c); return /[";\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';'); }).join('\r\n');
        SN.saveFile('espaco_' + (st.parts.length ? st.parts[st.parts.length - 1] : st.root).replace(/[^\w\-]+/g, '_').slice(0, 40) + '.csv', '\ufeff' + csv);
      });

      // ---- teclado, redimensionamento e saída ----
      function onKey(e) {
        var t = e.target && e.target.tagName;
        if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
        if (e.key === 'Backspace' && st.data) { e.preventDefault(); up(); }
        else if (e.key === 'Enter' && st.sel) open(st.sel);
        else if (e.key === 'Escape' && st.sel) select(null);
      }
      document.addEventListener('keydown', onKey);
      var rt = null, lastW = 0, lastH = 0;
      var ro = window.ResizeObserver ? new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (st.data && (Math.abs(tm.clientWidth - lastW) > 2 || Math.abs(tm.clientHeight - lastH) > 2)) { lastW = tm.clientWidth; lastH = tm.clientHeight; drawMap(); if (st.sel) { var s = st.sel; st.sel = null; var nb = st.blocks.filter(function (x) { return x.kind === s.kind && x.name === s.name; })[0]; if (nb) select(nb); } } }, 160);
      }) : null;
      if (ro) ro.observe(tm);
      SN.onLeave(function () { clearInterval(st.timer); clearTimeout(rt); document.removeEventListener('keydown', onKey); if (ro) ro.disconnect(); tip.remove(); });

      // ---- início: reaproveita a análise anterior ou a pedida pela página Discos ----
      rootInp.value = SN.diskmapRoot || (last && last.root) || SN.store.get('diskmapRoot', 'C:\\');
      if (SN.diskmapAuto) { SN.diskmapAuto = false; start(); }
      else if (last) {
        SN.api.get('/api/diskscan/' + last.id).then(function (s) {
          if (s.state === 'done') { st.id = last.id; st.root = last.root; st.status = s; empty.style.display = 'none'; navigate(last.parts || []); }
          else if (s.state === 'scanning') { st.id = last.id; st.root = last.root; setBusy(true); poll(); st.timer = setInterval(poll, 600); }
        }).catch(function () { last = null; });
      }
      SN.diskmapRoot = null;
    }
  });
})();
