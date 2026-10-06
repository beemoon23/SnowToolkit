'use strict';
/* SnowToolkit - nucleo da interface: DOM, API, console (dock), modais, tabelas e paginas de dados. */
(function () {
  var SN = (window.SN = { pages: {}, groups: [], leave: [], store: { data: {} }, creds: null, about: {} });

  // ---------- DOM ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2);
    var after = {};
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'indeterminate') after[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      list.forEach(function (kid) {
        if (kid == null || kid === false) return;
        if (Array.isArray(kid)) return add(kid);
        el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
      });
    })(kids);
    Object.keys(after).forEach(function (k) { el[k] = after[k]; });
    return el;
  }
  SN.h = h;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  SN.$ = $;
  SN.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  var ICONS = {
    dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    disk: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
    pkg: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    term: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    clip: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    act: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    power: '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'
  };
  SN.icon = function (name, size) {
    var s = size || 18;
    return h('span', { html: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.info) + '</svg>', style: { display: 'inline-flex' } });
  };

  // ---------- utilidades ----------
  SN.fmtBytes = function (n) {
    n = Number(n) || 0;
    if (n >= 1073741824) return (n / 1073741824).toFixed(n >= 107374182400 ? 0 : 1) + ' GB';
    if (n >= 1048576) return (n / 1048576).toFixed(n >= 104857600 ? 0 : 1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return Math.round(n) + ' B';
  };
  SN.fmtRate = function (bps) { return SN.fmtBytes(bps) + '/s'; };
  SN.fmtUptime = function (s) { s = Math.floor(s); var d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return (d ? d + 'd ' : '') + hh + 'h ' + m + 'min'; };
  SN.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  SN.clock = function (d) { d = d || new Date(); return SN.pad(d.getHours()) + ':' + SN.pad(d.getMinutes()) + ':' + SN.pad(d.getSeconds()); };
  SN.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  SN.copy = function (text, msg) {
    var done = function () { SN.toast(msg || 'Copiado', 'ok'); };
    var fallback = function () {
      var ta = h('textarea', { style: { position: 'fixed', opacity: 0 } });
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { SN.toast('Não foi possível copiar', 'bad'); }
      ta.remove();
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback(); } catch (e) { fallback(); }
  };
  SN.onLeave = function (fn) { SN.leave.push(fn); };
  SN.runLeave = function () { var l = SN.leave; SN.leave = []; l.forEach(function (f) { try { f(); } catch (e) { } }); };
  SN.bad = function (v) { return v == null || v === '' ? h('span', { class: 'faint' }, '—') : v; };

  // ---------- API ----------
  function req(method, path, body) {
    var opt = { method: method, headers: {} };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(path, opt).then(function (r) {
      return r.text().then(function (t) {
        var d = null; try { d = JSON.parse(t); } catch (e) { }
        if (!r.ok) throw new Error((d && d.error) || t || 'HTTP ' + r.status);
        return d;
      });
    });
  }
  SN.api = {
    get: function (p) { return req('GET', p); },
    post: function (p, b) { return req('POST', p, b || {}); },
    put: function (p, b) { return req('PUT', p, b); },
    query: function (id, params) { return req('POST', '/api/query', { id: id, params: params || {} }); }
  };

  SN.store.load = function () {
    return SN.api.get('/api/store').then(function (d) { SN.store.data = d || {}; }).catch(function () { SN.store.data = {}; });
  };
  var saveT;
  SN.store.save = function () {
    clearTimeout(saveT);
    saveT = setTimeout(function () { SN.api.put('/api/store', SN.store.data).catch(function () { }); }, 400);
  };
  SN.store.get = function (k, d) { return SN.store.data[k] === undefined ? d : SN.store.data[k]; };
  SN.store.set = function (k, v) { SN.store.data[k] = v; SN.store.save(); };

  // ---------- toasts ----------
  SN.toast = function (msg, kind, ms) {
    var box = $('#toasts');
    var t = h('div', { class: 'toast ' + (kind || '') }, msg);
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 3800);
  };

  // ---------- menu ----------
  var openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }
  document.addEventListener('click', function (e) { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }, true);
  SN.menu = function (anchor, items) {
    closeMenu();
    var m = h('div', { class: 'menu' });
    items.forEach(function (it) {
      if (it === '-') return m.appendChild(h('hr'));
      m.appendChild(h('button', { class: it.danger ? 'danger' : '', onclick: function () { closeMenu(); it.run(); } }, it.label));
    });
    document.body.appendChild(m);
    var r = anchor.getBoundingClientRect();
    var left = Math.min(r.right - m.offsetWidth, window.innerWidth - m.offsetWidth - 8);
    var top = r.bottom + 4;
    if (top + m.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 4);
    m.style.left = Math.max(8, left) + 'px';
    m.style.top = top + 'px';
    openMenu = m;
  };

  // ---------- modal ----------
  SN.modal = function (o) {
    var ov = h('div', { class: 'ov' });
    var body = h('div', { class: 'dlg-b' }, o.body || []);
    var foot = h('div', { class: 'dlg-f' });
    var dlg = h('div', { class: 'dlg' + (o.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'dlg-h' }, h('h3', null, o.title || '')), body, foot);
    ov.appendChild(dlg);
    var api = {
      el: dlg, body: body,
      close: function () { ov.remove(); document.removeEventListener('keydown', onKey, true); if (o.onClose) o.onClose(); }
    };
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); api.close(); } }
    document.addEventListener('keydown', onKey, true);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) api.close(); });
    (o.actions || [{ label: 'Fechar' }]).forEach(function (a) {
      var b = h('button', { class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : '') }, a.label);
      b.addEventListener('click', function () { var r = a.run ? a.run(api) : undefined; if (r !== false) api.close(); });
      foot.appendChild(b);
      if (a.primary) api.primary = b;
    });
    document.body.appendChild(ov);
    var f = dlg.querySelector('input,select,textarea'); if (f) f.focus(); else if (api.primary) api.primary.focus();
    return api;
  };

  SN.confirm = function (o) {
    return new Promise(function (res) {
      var done = false;
      var finish = function (v) { if (!done) { done = true; res(v); } };
      var kids = [];
      if (o.body) kids.push(typeof o.body === 'string' ? h('div', null, o.body) : o.body);
      if (o.list) kids.push(h('ul', { style: { margin: 0, paddingLeft: '20px', color: 'var(--muted)' } }, o.list.map(function (x) { return h('li', null, x); })));
      if (o.warn) kids.push(h('div', { class: 'note warn' }, o.warn));
      SN.modal({
        title: o.title || 'Confirmar', body: kids, onClose: function () { finish(false); },
        actions: [{ label: 'Cancelar', run: function () { finish(false); } }, { label: o.ok || 'Executar', primary: !o.danger, danger: !!o.danger, run: function () { finish(true); } }]
      });
    });
  };

  // fields: [{id,label,type,value,placeholder,options:[[v,l]],hint}]
  SN.form = function (o) {
    return new Promise(function (res) {
      var done = false, inputs = {};
      var kids = [];
      if (o.intro) kids.push(h('div', { class: 'hint' }, o.intro));
      o.fields.forEach(function (f) {
        var el;
        if (f.type === 'select') el = h('select', { class: 'inp' }, f.options.map(function (p) { return h('option', { value: p[0] }, p[1]); }));
        else if (f.type === 'textarea') el = h('textarea', { class: 'inp', rows: f.rows || 4, placeholder: f.placeholder || '' });
        else if (f.type === 'checkbox') el = h('input', { type: 'checkbox' });
        else el = h('input', { class: 'inp', type: f.type || 'text', placeholder: f.placeholder || '', autocomplete: 'off' });
        if (f.type === 'checkbox') el.checked = !!f.value; else if (f.value != null) el.value = f.value;
        inputs[f.id] = el;
        if (f.type === 'checkbox') kids.push(h('label', { class: 'chk' }, el, f.label));
        else kids.push(h('label', { class: 'fld' }, h('span', null, f.label), el, f.hint ? h('small', { class: 'faint' }, f.hint) : null));
      });
      var getVals = function () {
        var v = {};
        o.fields.forEach(function (f) { v[f.id] = f.type === 'checkbox' ? inputs[f.id].checked : inputs[f.id].value.trim(); });
        return v;
      };
      var m = SN.modal({
        title: o.title, body: kids, onClose: function () { if (!done) { done = true; res(null); } },
        actions: [{ label: 'Cancelar' }, {
          label: o.ok || 'OK', primary: true, run: function () {
            var v = getVals();
            for (var i = 0; i < o.fields.length; i++) {
              var f = o.fields[i];
              if (f.required && !v[f.id]) { SN.toast('Preencha: ' + f.label, 'warn'); inputs[f.id].focus(); return false; }
            }
            done = true; res(v);
          }
        }]
      });
      Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener('keydown', function (e) { if (e.key === 'Enter' && inputs[k].tagName !== 'TEXTAREA') m.primary.click(); }); });
    });
  };

  // ---------- console (dock) ----------
  var dock = (SN.dock = { jobs: [], active: null, el: null });
  function lineClass(l) {
    var t = l.t;
    if (l.r) return 'ln prog';
    if (l.k === 'e') return 'ln err';
    if (l.k === 'i') return 'ln info';
    if (t.indexOf('>>') === 0) return 'ln step';
    if (t.indexOf('[OK]') === 0) return 'ln ok';
    if (t.indexOf('[XX]') === 0) return 'ln err';
    if (t.indexOf('[!!]') === 0) return 'ln warn';
    return 'ln';
  }
  function appendLine(body, l) {
    var last = body.lastChild;
    if (l.r) {
      if (last && last.classList.contains('prog')) { last.textContent = l.t; return; }
      body.appendChild(h('div', { class: 'ln prog' }, l.t));
      return;
    }
    if (last && last.classList.contains('prog')) last.remove();
    body.appendChild(h('div', { class: lineClass(l) }, l.t));
  }
  dock.open = function () { $('#dock').classList.add('open'); dock.updateBadge(); };
  dock.close = function () { $('#dock').classList.remove('open'); };
  dock.toggle = function () { var d = $('#dock'); if (d.classList.contains('open')) dock.close(); else dock.open(); };
  dock.running = function () { return dock.jobs.filter(function (j) { return !j.done; }).length; };
  dock.updateBadge = function () {
    var n = dock.running();
    $('#jobs-dot').className = 'dot' + (n ? ' run' : dock.jobs.length ? ' ok' : '');
    $('#jobs-txt').textContent = n ? n + ' em execução' : 'Console';
  };
  dock.renderTabs = function () {
    var box = SN.clear($('#dtabs'));
    dock.jobs.forEach(function (j) {
      box.appendChild(h('button', { class: 'dtab' + (j === dock.active ? ' on' : ''), onclick: function () { dock.select(j); } },
        h('span', { class: 'dot ' + (j.done ? (j.exit === 0 && !j.cancelled ? 'ok' : 'bad') : 'run') }), j.name,
        h('span', { class: 'x', title: 'Fechar', onclick: function (e) { e.stopPropagation(); dock.remove(j); } }, '×')));
    });
    $('#d-cancel').style.display = dock.active && !dock.active.done ? '' : 'none';
  };
  dock.select = function (j) {
    dock.active = j;
    var body = SN.clear($('#dock-body'));
    j.lines.slice(-4000).forEach(function (l) { appendLine(body, l); });
    if (j.done) body.appendChild(h('div', { class: 'ln end' }, j.cancelled ? '— cancelado —' : '— fim (código ' + j.exit + ') —'));
    body.scrollTop = body.scrollHeight;
    dock.renderTabs();
  };
  dock.remove = function (j) {
    if (!j.done) SN.api.post('/api/jobs/' + j.id + '/cancel').catch(function () { });
    if (j.es) j.es.close();
    dock.jobs = dock.jobs.filter(function (x) { return x !== j; });
    if (dock.active === j) { dock.active = dock.jobs[dock.jobs.length - 1] || null; if (dock.active) dock.select(dock.active); else SN.clear($('#dock-body')); }
    dock.renderTabs(); dock.updateBadge();
    if (!dock.jobs.length) dock.close();
  };
  dock.attach = function (id, name) {
    return new Promise(function (resolve) {
      var j = { id: id, name: name, lines: [], seen: 0, done: false, exit: null, cancelled: false, retry: 0 };
      dock.jobs.push(j);
      if (dock.jobs.length > 12) { var old = dock.jobs.find(function (x) { return x.done; }); if (old) dock.remove(old); }
      dock.open(); dock.select(j); dock.updateBadge();
      function connect() {
        var es = new EventSource('/api/jobs/' + id + '/events?from=' + j.seen);
        j.es = es;
        es.addEventListener('line', function (e) {
          var l = JSON.parse(e.data); j.seen++; j.lines.push(l);
          if (dock.active === j) {
            var body = $('#dock-body');
            var stick = body.scrollTop + body.clientHeight >= body.scrollHeight - 50;
            appendLine(body, l);
            if (stick) body.scrollTop = body.scrollHeight;
          }
        });
        es.addEventListener('done', function (e) {
          var d = JSON.parse(e.data); j.done = true; j.exit = d.exit; j.cancelled = d.cancelled; es.close();
          if (dock.active === j) dock.select(j);
          dock.renderTabs(); dock.updateBadge();
          var ok = d.exit === 0 && !d.cancelled && !j.lines.some(function (l) { return l.t.indexOf('[XX]') === 0; });
          SN.toast(name + (d.cancelled ? ': cancelado' : ok ? ': concluído' : ': terminou com erros'), d.cancelled ? 'warn' : ok ? 'ok' : 'bad');
          resolve({ exit: d.exit, ok: ok, job: j });
        });
        es.onerror = function () {
          if (j.done) return;
          es.close();
          if (++j.retry <= 5) setTimeout(connect, 1200);
          else { j.done = true; j.exit = -1; dock.renderTabs(); dock.updateBadge(); resolve({ exit: -1, ok: false, job: j }); }
        };
      }
      connect();
    });
  };

  SN.runAction = function (id, name, params) {
    return SN.api.post('/api/action', { id: id, name: name, params: params || {} }).then(function (r) { return dock.attach(r.id, name); })
      .catch(function (e) { SN.toast('Falha ao iniciar: ' + e.message, 'bad'); return { exit: -1, ok: false }; });
  };
  SN.runScript = function (name, script, params) {
    return SN.api.post('/api/run', { name: name, script: script, params: params || {} }).then(function (r) { return dock.attach(r.id, name); })
      .catch(function (e) { SN.toast('Falha ao iniciar: ' + e.message, 'bad'); return { exit: -1, ok: false }; });
  };
  // acao com confirmacao opcional: SN.act({id,name,params,confirm:{title,body,danger,ok,warn,list}})
  SN.act = function (o) {
    var go = function () { return SN.runAction(o.id, o.name || o.id, o.params); };
    if (!o.confirm) return go();
    return SN.confirm(Object.assign({ title: o.name }, o.confirm)).then(function (yes) { return yes ? go() : { ok: false, cancelled: true }; });
  };
  SN.launch = function (id) {
    return SN.api.post('/api/launch', { id: id }).catch(function (e) { SN.toast(e.message, 'bad'); });
  };
  SN.saveFile = function (name, content) {
    return SN.api.post('/api/save', { name: name, content: content }).then(function (r) {
      SN.toast('Salvo em ' + r.path, 'ok', 6000); return r.path;
    }).catch(function (e) { SN.toast('Não foi possível salvar: ' + e.message, 'bad'); });
  };

  // ---------- tabelas ----------
  function cellText(v) { return v == null ? '' : String(v); }
  SN.table = function (o) {
    var st = { rows: o.rows || [], q: '', sort: o.sortBy || null, desc: !!o.desc, limit: o.pageSize || 250, sel: new Set() };
    var root = h('div', { class: 'tbl' });
    var search = h('input', { class: 'inp', type: 'search', placeholder: o.placeholder || 'Filtrar...', 'aria-label': 'Filtrar tabela' });
    var count = h('span', { class: 'muted' });
    var extra = h('div', { class: 'row', style: { gap: '8px' } }, o.toolbar || []);
    var bar = h('div', { class: 'tbl-bar' }, o.search === false ? null : search, extra, h('span', { class: 'sp' }), count);
    if (o.exportName) bar.appendChild(h('button', { class: 'btn sm ghost', title: 'Salvar CSV na área de trabalho', onclick: exportCsv }, SN.icon('dl', 15), 'CSV'));
    var wrap = h('div', { class: 'tbl-wrap' });
    if (o.maxH) wrap.style.maxHeight = o.maxH;
    root.append(bar, wrap);
    search.addEventListener('input', SN.debounce(function () { st.q = search.value.toLowerCase(); st.limit = o.pageSize || 250; draw(); }, 120));

    function visible() {
      var rows = st.rows;
      if (st.q) {
        var keys = o.cols.filter(function (c) { return c.k && c.search !== false; }).map(function (c) { return c.k; });
        rows = rows.filter(function (r) { return keys.some(function (k) { return cellText(r[k]).toLowerCase().indexOf(st.q) >= 0; }); });
      }
      if (o.filter) rows = rows.filter(o.filter);
      if (st.sort) {
        var col = o.cols.find(function (c) { return c.k === st.sort; });
        var num = col && (col.sort === 'num' || (col.sort !== 'str' && rows.length && typeof rows[0][st.sort] === 'number'));
        rows = rows.slice().sort(function (a, b) {
          var x = a[st.sort], y = b[st.sort];
          if (x == null) x = num ? -Infinity : ''; if (y == null) y = num ? -Infinity : '';
          var r = num ? x - y : String(x).localeCompare(String(y), 'pt-BR', { numeric: true, sensitivity: 'base' });
          return st.desc ? -r : r;
        });
      }
      return rows;
    }
    function draw() {
      var rows = visible();
      count.textContent = rows.length + (rows.length === st.rows.length ? '' : ' de ' + st.rows.length) + ' itens';
      SN.clear(wrap);
      if (!rows.length) { wrap.appendChild(h('div', { class: 'empty', style: { border: 0 } }, st.rows.length ? 'Nada corresponde ao filtro.' : (o.empty || 'Nada para mostrar.'))); return; }
      var tr = h('tr');
      if (o.selectable) {
        var all = h('input', { type: 'checkbox', title: 'Selecionar todos', onchange: function (e) { rows.forEach(function (r) { var i = st.rows.indexOf(r); if (e.target.checked) st.sel.add(i); else st.sel.delete(i); }); draw(); notifySel(); } });
        all.checked = rows.every(function (r) { return st.sel.has(st.rows.indexOf(r)); });
        tr.appendChild(h('th', { style: { width: '34px' } }, all));
      }
      o.cols.forEach(function (c) {
        var sortable = c.k && c.sortable !== false;
        var th = h('th', { class: sortable ? 'sortable' : '', style: c.w ? { width: c.w } : null }, c.label, st.sort === c.k ? h('span', { class: 'ar' }, st.desc ? '▾' : '▴') : null);
        if (sortable) th.addEventListener('click', function () { if (st.sort === c.k) st.desc = !st.desc; else { st.sort = c.k; st.desc = c.sort === 'num'; } draw(); });
        tr.appendChild(th);
      });
      if (o.actions) tr.appendChild(h('th', null, ''));
      var tbody = h('tbody');
      rows.slice(0, st.limit).forEach(function (r) {
        var idx = st.rows.indexOf(r);
        var row = h('tr', { class: (o.rowClass ? o.rowClass(r) : '') + (st.sel.has(idx) ? ' sel' : '') });
        if (o.selectable) row.appendChild(h('td', null, h('input', { type: 'checkbox', checked: st.sel.has(idx), onchange: function (e) { if (e.target.checked) st.sel.add(idx); else st.sel.delete(idx); row.classList.toggle('sel', e.target.checked); notifySel(); } })));
        o.cols.forEach(function (c) {
          var v = c.k ? r[c.k] : null;
          var content = c.fmt ? c.fmt(v, r) : (v == null || v === '' ? h('span', { class: 'faint' }, '—') : String(v));
          var td = h('td', { class: (c.cls || '') + (c.wrap ? ' wrap' : ''), style: c.align ? { textAlign: c.align } : null, title: c.tip === false ? null : (typeof v === 'string' && v.length > 30 ? v : null) }, content);
          row.appendChild(td);
        });
        if (o.actions) {
          var acts = o.actions(r) || [];
          var inline = acts.slice(0, o.inline == null ? 2 : o.inline), rest = acts.slice(inline.length);
          var td2 = h('td', { class: 'acts' });
          inline.forEach(function (a) { td2.appendChild(h('button', { class: 'btn sm' + (a.danger ? ' danger' : ''), onclick: function () { a.run(r); } }, a.label)); });
          if (rest.length) td2.appendChild(h('button', { class: 'btn sm ghost icon', title: 'Mais ações', onclick: function (e) { SN.menu(e.currentTarget, rest.map(function (a) { return a === '-' ? a : { label: a.label, danger: a.danger, run: function () { a.run(r); } }; })); } }, SN.icon('more', 16)));
          row.appendChild(td2);
        }
        if (o.onRow) { row.style.cursor = 'pointer'; row.addEventListener('dblclick', function () { o.onRow(r); }); }
        tbody.appendChild(row);
      });
      wrap.appendChild(h('table', { class: 't' }, h('thead', null, tr), tbody));
      if (rows.length > st.limit) wrap.appendChild(h('div', { class: 'more' }, 'Mostrando ' + st.limit + ' de ' + rows.length + '. ', h('button', { class: 'btn sm', onclick: function () { st.limit += 400; draw(); } }, 'Mostrar mais')));
    }
    function notifySel() { if (o.onSel) o.onSel(api.selected()); }
    function exportCsv() {
      var rows = visible(), cols = o.cols.filter(function (c) { return c.k; });
      var esc = function (v) { v = cellText(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = '﻿' + cols.map(function (c) { return esc(c.label); }).join(';') + '\r\n' + rows.map(function (r) { return cols.map(function (c) { return esc(r[c.k]); }).join(';'); }).join('\r\n');
      SN.saveFile(o.exportName + '_' + new Date().toISOString().slice(0, 10) + '.csv', csv);
    }
    var api = {
      el: root,
      setRows: function (rows) { st.rows = rows || []; st.sel.clear(); draw(); notifySel(); },
      rows: function () { return st.rows; },
      selected: function () { return Array.from(st.sel).sort(function (a, b) { return a - b; }).map(function (i) { return st.rows[i]; }); },
      visible: visible, redraw: draw, focusSearch: function () { search.focus(); }
    };
    draw();
    return api;
  };

  // pagina de dados: consulta -> tabela, com recarregar e auto-atualizar opcional
  SN.dataPage = function (host, o) {
    var body = h('div'), tbl = null, busy = false, stamp = h('span', { class: 'faint' }), timer = null, autoSel = null;
    var reload = function (silent) {
      if (busy) return Promise.resolve(); busy = true;
      if (!tbl && !silent) { SN.clear(body); body.appendChild(h('div', { class: 'loading' }, h('div', { class: 'spin' }), o.loadingText || 'Consultando o sistema...')); }
      refreshBtn.disabled = true;
      return SN.api.query(o.query, o.params ? o.params() : {}).then(function (data) {
        if (o.check) { var err = o.check(data); if (err) throw new Error(err); }
        var rows = o.map ? o.map(data) : data;
        if (!tbl) { tbl = SN.table(Object.assign({}, o.table, { rows: rows, toolbar: (o.table && o.table.toolbar) || [] })); SN.clear(body); if (o.note) body.appendChild(h('div', { class: 'note', style: { marginBottom: '10px' } }, o.note)); body.appendChild(tbl.el); }
        else tbl.setRows(rows);
        stamp.textContent = 'atualizado às ' + SN.clock();
        if (o.onData) o.onData(data, rows, tbl);
      }).catch(function (e) {
        if (tbl && silent) return;
        SN.clear(body); tbl = null;
        body.appendChild(h('div', { class: 'err-box' }, h('b', null, 'Não foi possível consultar'), h('div', { class: 'mono', style: { whiteSpace: 'pre-wrap' } }, e.message), h('button', { class: 'btn', onclick: function () { reload(); } }, 'Tentar de novo')));
      }).then(function () { busy = false; refreshBtn.disabled = false; });
    };
    var refreshBtn = h('button', { class: 'btn', onclick: function () { reload(); } }, SN.icon('refresh', 15), 'Atualizar');
    var leftBar = h('div', { class: 'row', style: { marginBottom: '12px' } }, refreshBtn, o.toolbar ? o.toolbar(reload) : null);
    if (o.auto) {
      autoSel = h('select', { class: 'inp', onchange: function () { clearInterval(timer); var s = Number(autoSel.value); if (s) timer = setInterval(function () { reload(true); }, s * 1000); } },
        h('option', { value: 0 }, 'Auto: desligado'), h('option', { value: 5 }, 'A cada 5 s'), h('option', { value: 15 }, 'A cada 15 s'), h('option', { value: 60 }, 'A cada 60 s'));
      leftBar.appendChild(autoSel);
    }
    leftBar.appendChild(stamp);
    host.append(leftBar, body);
    SN.onLeave(function () { clearInterval(timer); });
    reload();
    return { reload: reload, table: function () { return tbl; } };
  };

  // abas internas de pagina
  SN.tabs = function (host, defs, key) {
    var bar = h('div', { class: 'tabs', role: 'tablist' }), pane = h('div');
    var memo = (SN.tabMemo = SN.tabMemo || {});
    function show(id) {
      memo[key] = id; SN.runLeave();
      Array.prototype.forEach.call(bar.children, function (b) { b.classList.toggle('on', b.dataset.id === id); });
      SN.clear(pane);
      defs.find(function (d) { return d.id === id; }).render(pane);
    }
    defs.forEach(function (d) { bar.appendChild(h('button', { class: 'tab', role: 'tab', 'data-id': d.id, onclick: function () { show(d.id); } }, d.label)); });
    host.append(bar, pane);
    show(memo[key] && defs.some(function (d) { return d.id === memo[key]; }) ? memo[key] : defs[0].id);
  };

  SN.card = function (title, kids, opts) {
    opts = opts || {};
    return h('div', { class: 'card' + (opts.cls ? ' ' + opts.cls : '') },
      title ? h('div', { class: 'card-h' }, h('h3', null, title), h('span', { class: 'sp' }), opts.right || null) : null, kids);
  };
  SN.kv = function (pairs) {
    var dl = h('dl', { class: 'kv' });
    pairs.forEach(function (p) { if (p) { dl.appendChild(h('dt', null, p[0])); dl.appendChild(h('dd', null, p[1] == null || p[1] === '' ? h('span', { class: 'faint' }, '—') : p[1])); } });
    return dl;
  };
  SN.loading = function (text) { return h('div', { class: 'loading' }, h('div', { class: 'spin' }), text || 'Carregando...'); };
  SN.errBox = function (msg, retry) { return h('div', { class: 'err-box' }, h('b', null, 'Algo deu errado'), h('div', { class: 'mono', style: { whiteSpace: 'pre-wrap' } }, msg), retry ? h('button', { class: 'btn', onclick: retry }, 'Tentar de novo') : null); };
  SN.page = function (id, def) { def.id = id; SN.pages[id] = def; };
  SN.group = function (label, ids) { SN.groups.push({ label: label, ids: ids }); };
})();
