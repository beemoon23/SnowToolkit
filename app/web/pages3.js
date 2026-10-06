'use strict';
/* Rede, Maquinas, Seguranca, Usuarios, Logs, Impressoras, Terminal, Atalhos, Relatorios, Sobre */
(function () {
  var SN = window.SN, h = SN.h;
  var badge = function (v, good, bad) { var cls = good && good.test(v) ? 'ok' : bad && bad.test(v) ? 'bad' : ''; return h('span', { class: 'badge ' + cls }, v == null || v === '' ? '—' : String(v)); };
  var onoff = function (v) { return h('span', { class: 'badge ' + (v ? 'ok' : 'bad') }, v ? 'Ligado' : 'Desligado'); };
  var yesno = function (v, goodWhenTrue) { return h('span', { class: 'badge ' + ((v ? goodWhenTrue : !goodWhenTrue) ? 'ok' : 'warn') }, v ? 'Sim' : 'Não'); };
  var card = SN.card;

  /* ================= REDE ================= */
  SN.page('network', {
    title: 'Rede', sub: 'Adaptadores, diagnóstico, scanner, conexões e Wi-Fi', icon: 'globe',
    render: function (view) {
      SN.tabs(view, [
        { id: 'nics', label: 'Adaptadores', render: function (p) {
          var pub = h('div', null, SN.loading('Consultando IP público...'));
          SN.api.query('publicip').then(function (d) {
            SN.clear(pub).appendChild(d.ok === false ? h('span', { class: 'muted' }, 'Sem acesso à internet') : SN.kv([['IP público', h('b', { class: 'mono' }, d.ip)], ['Local', [d.city, d.region, d.country].filter(Boolean).join(', ')], ['Provedor', d.org]]));
          }).catch(function () { SN.clear(pub).appendChild(h('span', { class: 'muted' }, 'Sem acesso à internet')); });
          p.appendChild(h('div', { style: { marginBottom: '14px' } }, card('Internet', pub, { right: h('button', { class: 'btn sm', onclick: function () { SN.act({ id: 'net_tool', name: 'Teste de internet', params: { TOOL: 'ping', HOST: '1.1.1.1', COUNT: '4' } }); } }, 'Testar')})));
          SN.dataPage(p, {
            query: 'nics', table: {
              exportName: 'adaptadores', cols: [
                { k: 'name', label: 'Adaptador', fmt: function (v, r) { return h('div', null, h('b', null, v), h('div', { class: 'faint', style: { fontSize: '11.5px' } }, r.desc)); } },
                { k: 'status', label: 'Estado', fmt: function (v) { return badge(v, /^up$/i, /disconnected|down|disabled/i); } },
                { k: 'ip', label: 'IPv4', cls: 'mono' }, { k: 'gw', label: 'Gateway', cls: 'mono' }, { k: 'dns', label: 'DNS', cls: 'mono' }, { k: 'dhcp', label: 'DHCP' }, { k: 'speed', label: 'Velocidade' }, { k: 'mac', label: 'MAC', cls: 'mono' }],
              actions: function (r) { return [{ label: 'Copiar IP', run: function () { SN.copy(r.ip || ''); } }, { label: 'Copiar MAC', run: function () { SN.copy(r.mac || ''); } }, { label: 'ipconfig /all', run: function () { SN.act({ id: 'net_tool', name: 'ipconfig /all', params: { TOOL: 'ipconfig' } }); } }]; }
            }
          });
          p.appendChild(h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: function () { SN.launch('ncpa'); } }, 'Conexões de rede (ncpa.cpl)'), h('button', { class: 'btn', onclick: function () { SN.act({ id: 'repair', name: 'Renovar IP', params: { WHAT: 'iprenew' } }); } }, 'Renovar IP'), h('button', { class: 'btn', onclick: function () { SN.act({ id: 'repair', name: 'Limpar DNS', params: { WHAT: 'dnsflush' } }); } }, 'Limpar DNS')));
        } },
        { id: 'tools', label: 'Ferramentas', render: function (p) {
          var tool = h('select', { class: 'inp' }, [['ping', 'Ping'], ['tracert', 'Traceroute'], ['pathping', 'PathPing'], ['nslookup', 'NSLookup'], ['dns', 'Resolver nome (Resolve-DnsName)'], ['port', 'Testar porta TCP'], ['arp', 'Tabela ARP'], ['route', 'Tabela de rotas'], ['ipconfig', 'ipconfig /all']].map(function (o) { return h('option', { value: o[0] }, o[1]); }));
          var host = h('input', { class: 'inp', placeholder: 'Host ou IP (ex.: google.com, 10.0.0.1)', style: { minWidth: '280px' } });
          var port = h('input', { class: 'inp', placeholder: 'Porta', style: { width: '90px' } }), count = h('input', { class: 'inp', type: 'number', value: 4, min: 1, max: 100, style: { width: '80px' } });
          function run() {
            var t = tool.value, needH = !/^(arp|route|ipconfig)$/.test(t);
            if (needH && !host.value.trim()) { SN.toast('Informe o host', 'warn'); return host.focus(); }
            if (t === 'port' && !port.value.trim()) { SN.toast('Informe a porta', 'warn'); return port.focus(); }
            SN.act({ id: 'net_tool', name: tool.options[tool.selectedIndex].text + (host.value ? ' ' + host.value : ''), params: { TOOL: t, HOST: host.value.trim(), PORT: port.value.trim(), COUNT: String(count.value || 4) } });
          }
          host.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
          p.append(card('Diagnóstico de rede', h('div', { class: 'row' }, tool, host, port, h('span', { class: 'muted' }, 'Pings:'), count, h('button', { class: 'btn primary', onclick: run }, SN.icon('play', 14), 'Executar'))),
            h('div', { style: { height: '14px' } }),
            card('Atalhos', h('div', { class: 'qa' }, [['Internet (1.1.1.1)', 'ping 1.1.1.1', { TOOL: 'ping', HOST: '1.1.1.1' }], ['DNS (google.com)', 'Resolve nome', { TOOL: 'dns', HOST: 'google.com' }], ['Rota até 8.8.8.8', 'tracert', { TOOL: 'tracert', HOST: '8.8.8.8' }], ['Vizinhos (ARP)', 'arp -a', { TOOL: 'arp' }]].map(function (a) { return h('button', { onclick: function () { SN.act({ id: 'net_tool', name: a[0], params: a[2] }); } }, h('b', null, a[0]), h('span', null, a[1])); }))));
        } },
        { id: 'scan', label: 'Scanner de rede', render: function (p) {
          var base = h('input', { class: 'inp', placeholder: 'Sub-rede, ex.: 10.0.0', value: SN.store.get('scanBase', ''), style: { width: '170px' } });
          var ports = h('input', { class: 'inp', placeholder: 'Portas (opcional): 22,80,443,3389', value: SN.store.get('scanPorts', '80,443,445,3389'), style: { width: '260px' } });
          var box = h('div'), busy = false;
          function scan() {
            if (busy) return; busy = true; SN.store.set('scanBase', base.value.trim()); SN.store.set('scanPorts', ports.value.trim());
            SN.clear(box).appendChild(SN.loading('Varrendo ' + (base.value.trim() || 'sua sub-rede') + '.1-254 (cerca de 1 minuto)...'));
            SN.api.query('netscan', { BASE: base.value.trim(), PORTS: ports.value.trim() }).then(function (d) {
              if (d.ok === false) throw new Error(d.error || 'Falha na varredura');
              var rows = (d.hosts || []).map(function (r) { r.ipn = r.ip.split('.').reduce(function (a, b) { return a * 256 + Number(b); }, 0); return r; });
              SN.clear(box).appendChild(SN.table({ rows: rows, sortBy: 'ipn', exportName: 'scanner_rede', cols: [
                { k: 'ip', label: 'IP', cls: 'mono', sort: 'num', fmt: function (v) { return h('b', null, v); } }, { k: 'name', label: 'Nome' }, { k: 'mac', label: 'MAC', cls: 'mono' }, { k: 'ms', label: 'Latência', sort: 'num', fmt: function (v) { return v == null ? '—' : v + ' ms'; } }, { k: 'ports', label: 'Portas abertas', cls: 'mono' }],
                actions: function (r) { return [{ label: 'Ping', run: function () { SN.act({ id: 'net_tool', name: 'Ping ' + r.ip, params: { TOOL: 'ping', HOST: r.ip } }); } }, { label: 'RDP', run: function () { SN.act({ id: 'remote', name: 'RDP ' + r.ip, params: { HOST: r.ip, OP: 'rdp' } }); } }, { label: 'Acordar (WoL)', run: function () { wol(r.mac); } }, { label: 'Copiar IP', run: function () { SN.copy(r.ip); } }, { label: 'Adicionar a Máquinas', run: function () { SN.addMachine({ name: r.name || r.ip, host: r.ip, mac: r.mac }); } }]; } }).el);
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, scan)); }).then(function () { busy = false; });
          }
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, base, ports, h('button', { class: 'btn primary', onclick: scan }, SN.icon('search', 15), 'Varrer')), h('div', { class: 'note', style: { marginBottom: '10px' } }, 'Deixe a sub-rede em branco para usar a rede atual. A varredura usa ping + ARP + teste de portas.'), box);
        } },
        { id: 'conn', label: 'Conexões', render: function (p) {
          var st = 'Established', dp;
          var sel = h('select', { class: 'inp', onchange: function () { st = sel.value; dp.reload(); } }, [['Established', 'Estabelecidas'], ['Listen', 'Escutando (portas abertas)'], ['TimeWait', 'TimeWait'], ['All', 'Todas']].map(function (o) { return h('option', { value: o[0] }, o[1]); }));
          dp = SN.dataPage(p, { query: 'connections', params: function () { return { STATE: st }; }, auto: true, toolbar: function () { return sel; }, table: { exportName: 'conexoes', placeholder: 'Filtrar por processo, IP, porta...', cols: [{ k: 'proc', label: 'Processo', fmt: function (v) { return h('b', null, v); } }, { k: 'pid', label: 'PID', sort: 'num', cls: 'mono' }, { k: 'local', label: 'Local', cls: 'mono' }, { k: 'lport', label: 'Porta', sort: 'num' }, { k: 'remote', label: 'Remoto', cls: 'mono' }, { k: 'rport', label: 'Porta', sort: 'num' }, { k: 'state', label: 'Estado' }], actions: function (r) { return [{ label: 'Encerrar processo', danger: true, run: function () { SN.act({ id: 'kill_process', name: 'Encerrar ' + r.proc, params: { PID: String(r.pid), NAME: r.proc }, confirm: { title: 'Encerrar processo', body: r.proc + ' (PID ' + r.pid + ')', danger: true, ok: 'Encerrar' } }); } }, { label: 'Copiar IP remoto', run: function () { SN.copy(r.remote); } }]; } } });
        } },
        { id: 'wifi', label: 'Wi-Fi salvos', render: function (p) {
          var show = false, dp;
          var cb = h('input', { type: 'checkbox', onchange: function () { show = cb.checked; dp.table() && dp.table().redraw(); } });
          dp = SN.dataPage(p, { query: 'wifi', toolbar: function () { return h('label', { class: 'chk' }, cb, 'Mostrar senhas'); }, note: 'Redes Wi-Fi gravadas neste computador. Senhas só aparecem para administradores.', table: { exportName: 'wifi', cols: [{ k: 'name', label: 'Rede', fmt: function (v) { return h('b', null, v); } }, { k: 'auth', label: 'Segurança' }, { k: 'password', label: 'Senha', search: false, fmt: function (v) { return v == null ? h('span', { class: 'faint' }, '(aberta / sem senha)') : h('span', { class: 'mono' }, show ? v : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'); } }], actions: function (r) { return r.password ? [{ label: 'Copiar senha', run: function () { SN.copy(r.password, 'Senha copiada'); } }] : []; } } });
        } },
        { id: 'shares', label: 'Compartilhamentos', render: function (p) {
          var box = h('div', null, SN.loading());
          function load() {
            SN.api.query('shares').then(function (d) {
              SN.clear(box).append(
                h('div', { class: 'grp-h' }, h('h4', null, 'Pastas compartilhadas')), SN.table({ rows: d.shares || [], search: false, cols: [{ k: 'name', label: 'Nome', fmt: function (v) { return h('b', null, v); } }, { k: 'path', label: 'Caminho', cls: 'mono' }, { k: 'desc', label: 'Descrição' }, { k: 'special', label: 'Tipo', fmt: function (v) { return badge(v ? 'Administrativo' : 'Usuário'); } }] }).el,
                h('div', { class: 'grp-h' }, h('h4', null, 'Sessões ativas')), SN.table({ rows: d.sessions || [], search: false, empty: 'Nenhuma sessão remota.', cols: [{ k: 'client', label: 'Cliente', cls: 'mono' }, { k: 'user', label: 'Usuário' }, { k: 'opens', label: 'Arquivos abertos' }, { k: 'secs', label: 'Tempo', fmt: function (v) { return SN.fmtUptime(v); } }] }).el,
                h('div', { class: 'grp-h' }, h('h4', null, 'Arquivos abertos por outros')), SN.table({ rows: d.open || [], search: false, empty: 'Nenhum.', cols: [{ k: 'client', label: 'Cliente', cls: 'mono' }, { k: 'user', label: 'Usuário' }, { k: 'path', label: 'Arquivo', cls: 'mono' }] }).el);
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, load)); });
          }
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), 'Atualizar')), box); load();
        } }
      ], 'network');
    }
  });

  function wol(mac) {
    if (!mac) return SN.toast('Sem endereço MAC', 'warn');
    SN.api.post('/api/wol', { mac: mac }).then(function (r) { SN.toast(r.ok ? 'Pacote Wake-on-LAN enviado para ' + mac : 'Não foi possível enviar', r.ok ? 'ok' : 'bad'); }).catch(function (e) { SN.toast(e.message, 'bad'); });
  }

  /* ================= MAQUINAS ================= */
  SN.addMachine = function (m) {
    var list = SN.store.get('machines', []).slice();
    if (list.some(function (x) { return x.host === m.host; })) return SN.toast('Já está na lista', 'warn');
    list.push(m); SN.store.set('machines', list); SN.toast('Adicionado a Máquinas', 'ok');
  };
  SN.page('machines', {
    title: 'Máquinas', sub: 'Monitor de disponibilidade, Wake-on-LAN e ações remotas', icon: 'monitor',
    render: function (view) {
      var box = h('div'), status = {}, timer = null, busy = false;
      var machines = function () { return SN.store.get('machines', []); };
      var credInfo = h('span', { class: 'muted' });
      function drawCred() { credInfo.textContent = SN.creds ? 'Credencial: ' + SN.creds.user + ' (só nesta sessão)' : 'Credencial: usuário atual do Windows'; }
      function remote(m, op, label, danger, extra) {
        var params = Object.assign({ HOST: m.host, OP: op }, SN.creds ? { USER: SN.creds.user, PASS: SN.creds.pass } : {}, extra || {});
        SN.act({ id: 'remote', name: label + ' · ' + m.name, params: params, confirm: danger ? { title: label, body: m.name + ' (' + m.host + ')', danger: true, ok: label } : null });
      }
      function edit(m, idx) {
        SN.form({ title: m ? 'Editar máquina' : 'Nova máquina', ok: 'Salvar', fields: [{ id: 'name', label: 'Nome', value: m ? m.name : '', required: true }, { id: 'host', label: 'Host ou IP', value: m ? m.host : '', required: true, hint: 'Somente letras, números, ponto e hífen' }, { id: 'mac', label: 'MAC (para Wake-on-LAN)', value: m ? m.mac : '', placeholder: 'AA-BB-CC-DD-EE-FF' }, { id: 'note', label: 'Observação', value: m ? m.note : '' }] }).then(function (v) {
          if (!v) return;
          if (!/^[A-Za-z0-9._\-]{1,253}$/.test(v.host)) return SN.toast('Host inválido', 'bad');
          var l = machines().slice(); if (m) l[idx] = v; else l.push(v); SN.store.set('machines', l); draw(); poll();
        });
      }
      function bulk() {
        SN.form({ title: 'Adicionar várias máquinas', ok: 'Adicionar', intro: 'Uma por linha: nome;host;mac (mac opcional). Ex.: Recepção;10.0.0.20;AA-BB-CC-DD-EE-FF', fields: [{ id: 'txt', label: 'Lista', type: 'textarea', rows: 8 }] }).then(function (v) {
          if (!v) return; var l = machines().slice(), n = 0;
          v.txt.split('\n').forEach(function (ln) { var p = ln.split(';').map(function (s) { return s.trim(); }); if (p[0] && p[1] && /^[A-Za-z0-9._\-]+$/.test(p[1]) && !l.some(function (x) { return x.host === p[1]; })) { l.push({ name: p[0], host: p[1], mac: p[2] || '', note: '' }); n++; } });
          SN.store.set('machines', l); SN.toast(n + ' máquina(s) adicionada(s)', 'ok'); draw(); poll();
        });
      }
      function draw() {
        var l = machines(); SN.clear(box);
        if (!l.length) { box.appendChild(h('div', { class: 'empty' }, 'Nenhuma máquina cadastrada. Adicione manualmente ou pelo Scanner de rede.')); return; }
        var up = l.filter(function (m) { return status[m.host] && status[m.host].up; }).length;
        box.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } }, h('span', { class: 'badge ok' }, up + ' online'), h('span', { class: 'badge ' + (l.length - up ? 'bad' : '') }, (l.length - up) + ' offline')));
        box.appendChild(SN.table({ rows: l.map(function (m, i) { return Object.assign({ _i: i }, m); }), exportName: 'maquinas', sortBy: 'name', cols: [
          { k: 'name', label: 'Máquina', fmt: function (v, r) { return h('div', null, h('b', null, v), r.note ? h('div', { class: 'faint', style: { fontSize: '11.5px' } }, r.note) : null); } },
          { k: 'host', label: 'Host', cls: 'mono' },
          { label: 'Estado', sortable: false, fmt: function (v, r) { var s = status[r.host]; return s ? h('span', { class: 'badge ' + (s.up ? 'ok' : 'bad') }, s.up ? 'Online · ' + s.ms + ' ms' : 'Offline') : h('span', { class: 'badge' }, '...'); } },
          { k: 'mac', label: 'MAC', cls: 'mono' }],
          actions: function (r) {
            var m = machines()[r._i];
            return [{ label: 'RDP', run: function () { remote(m, 'rdp', 'RDP'); } }, { label: 'Acordar', run: function () { wol(m.mac); } },
              { label: 'Informações', run: function () { info(m); } }, { label: 'Testar WinRM', run: function () { remote(m, 'test', 'Testar WinRM'); } }, { label: 'Ping', run: function () { remote(m, 'ping', 'Ping'); } },
              { label: 'Serviços parados', run: function () { remote(m, 'services', 'Serviços parados'); } }, { label: 'Top processos', run: function () { remote(m, 'processes', 'Top processos'); } }, { label: 'gpupdate', run: function () { remote(m, 'gpupdate', 'gpupdate'); } },
              { label: 'Executar comando...', run: function () { SN.form({ title: 'Comando em ' + m.name, ok: 'Executar', fields: [{ id: 'cmd', label: 'Comando PowerShell', required: true, placeholder: 'Get-Date' }] }).then(function (v) { if (v) remote(m, 'command', 'Comando', true, { CMD: v.cmd }); }); } }, '-',
              { label: 'Reiniciar', danger: true, run: function () { remote(m, 'restart', 'Reiniciar', true); } }, { label: 'Desligar', danger: true, run: function () { remote(m, 'shutdown', 'Desligar', true); } }, '-',
              { label: 'Editar', run: function () { edit(m, r._i); } }, { label: 'Remover', danger: true, run: function () { SN.confirm({ title: 'Remover da lista', body: m.name, danger: true, ok: 'Remover' }).then(function (y) { if (y) { var l2 = machines().slice(); l2.splice(r._i, 1); SN.store.set('machines', l2); draw(); } }); } }];
          }, inline: 2 }).el);
      }
      function info(m) {
        var body = h('div', null, SN.loading('Consultando ' + m.host + '...'));
        SN.modal({ title: m.name, body: [body], wide: true });
        SN.api.query('remote_info', Object.assign({ HOST: m.host }, SN.creds ? { USER: SN.creds.user, PASS: SN.creds.pass } : {})).then(function (d) {
          if (d.ok === false) throw new Error(d.error || 'Falha');
          var i = d.info || {}; SN.clear(body).appendChild(SN.kv([['Computador', i.host], ['Usuário logado', i.user], ['Sistema', (i.os || '') + ' · build ' + (i.build || '')], ['Modelo', i.model], ['Memória', i.ramGB + ' GB'], ['Espaço livre no C:', i.freeGB + ' GB'], ['Tempo ligado', i.uptime], ['IPs', i.ips]]));
        }).catch(function (e) { SN.clear(body).appendChild(SN.errBox(e.message + '\n\nRequer WinRM habilitado no destino (Enable-PSRemoting) e permissão de administrador.')); });
      }
      function poll() {
        if (busy) return; var l = machines(); if (!l.length) return; busy = true;
        SN.api.post('/api/pingmon', { hosts: l.map(function (m) { return m.host; }) }).then(function (r) { r.forEach(function (x) { status[x.host] = x; }); draw(); }).catch(function () { }).then(function () { busy = false; });
      }
      var setCred = h('button', { class: 'btn', onclick: function () {
        SN.form({ title: 'Credenciais para ações remotas', ok: 'Usar', intro: 'Ficam apenas na memória desta janela e nunca são gravadas em disco. Deixe vazio para usar o usuário atual.', fields: [{ id: 'user', label: 'Usuário (DOMINIO\\usuario)', value: SN.creds ? SN.creds.user : '' }, { id: 'pass', label: 'Senha', type: 'password' }] }).then(function (v) { if (!v) return; SN.creds = v.user ? { user: v.user, pass: v.pass } : null; drawCred(); });
      } }, SN.icon('lock', 15), 'Credenciais');
      view.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn primary', onclick: function () { edit(null); } }, SN.icon('plus', 15), 'Adicionar'), h('button', { class: 'btn', onclick: bulk }, 'Adicionar várias'), setCred, h('button', { class: 'btn', onclick: poll }, SN.icon('refresh', 15), 'Verificar agora'), credInfo), box);
      drawCred(); draw(); poll(); timer = setInterval(poll, 12000); SN.onLeave(function () { clearInterval(timer); });
    }
  });

  /* ================= SEGURANCA ================= */
  SN.page('security', {
    title: 'Segurança', sub: 'Defender, firewall, BitLocker, logins suspeitos e atualizações', icon: 'shield',
    render: function (view) {
      SN.tabs(view, [
        { id: 'def', label: 'Antivírus', render: function (p) {
          var box = h('div', null, SN.loading());
          function load() {
            SN.api.query('defender').then(function (d) {
              var s = d.status || {};
              SN.clear(box).append(h('div', { class: 'g2' },
                card('Microsoft Defender', SN.kv([['Antivírus', onoff(s.enabled)], ['Proteção em tempo real', onoff(s.realtime)], ['Proteção comportamental', onoff(s.behavior)], ['Definições', s.sigVersion], ['Idade das definições', (s.sigAge != null ? s.sigAge + ' dia(s)' : '—')], ['Atualizadas em', s.sigUpdated], ['Última verificação rápida', s.lastQuick], ['Última verificação completa', s.lastFull]])),
                card('Ameaças detectadas', (d.threats || []).length ? SN.table({ rows: d.threats, search: false, cols: [{ k: 'name', label: 'Ameaça' }, { k: 'severity', label: 'Severidade' }, { k: 'time', label: 'Quando' }, { k: 'status', label: 'Estado' }] }).el : h('div', { class: 'empty' }, 'Nenhuma ameaça registrada.'))));
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, load)); });
          }
          var def = function (op, label, body) { SN.act({ id: 'defender', name: label, params: { OP: op }, confirm: body ? { title: label, body: body, ok: 'Iniciar' } : null }).then(load); };
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), 'Atualizar'), h('button', { class: 'btn primary', onclick: function () { def('update', 'Atualizar definições'); } }, 'Atualizar definições'), h('button', { class: 'btn', onclick: function () { def('quick', 'Varredura rápida', 'Verifica as áreas mais comuns. Costuma levar alguns minutos.'); } }, 'Varredura rápida'), h('button', { class: 'btn', onclick: function () { def('full', 'Varredura completa', 'Verifica todos os arquivos. Pode levar horas.'); } }, 'Varredura completa')), box); load();
        } },
        { id: 'fw', label: 'Firewall', render: function (p) {
          var dp;
          var openPort = function () { SN.form({ title: 'Liberar porta de entrada', ok: 'Criar regra', fields: [{ id: 'port', label: 'Porta', required: true, placeholder: '8088' }, { id: 'proto', label: 'Protocolo', type: 'select', options: [['TCP', 'TCP'], ['UDP', 'UDP']] }, { id: 'name', label: 'Nome da regra (opcional)' }] }).then(function (v) { if (!v) return; if (!/^\d{1,5}$/.test(v.port)) return SN.toast('Porta inválida', 'bad'); SN.act({ id: 'firewall', name: 'Liberar ' + v.proto + ' ' + v.port, params: { OP: 'open', PORT: v.port, PROTO: v.proto, NAME: v.name } }).then(function () { dp.reload(); }); }); };
          dp = SN.dataPage(p, { query: 'firewall_rules', note: 'Regras de entrada criadas manualmente (exclui as regras padrão do Windows).', toolbar: function () { return [h('button', { class: 'btn primary', onclick: openPort }, SN.icon('plus', 15), 'Liberar porta'), h('button', { class: 'btn', onclick: function () { SN.act({ id: 'firewall', name: 'Ligar firewall', params: { OP: 'enable' } }); } }, 'Ligar em todos os perfis'), h('button', { class: 'btn', onclick: function () { SN.launch('wf'); } }, 'Firewall avançado')]; },
            table: { exportName: 'firewall', cols: [{ k: 'name', label: 'Regra', fmt: function (v) { return h('b', null, v); } }, { k: 'proto', label: 'Protocolo' }, { k: 'port', label: 'Porta' }, { k: 'profile', label: 'Perfil' }], actions: function (r) { return [{ label: 'Remover', danger: true, run: function () { SN.act({ id: 'firewall', name: 'Remover regra ' + r.name, params: { OP: 'remove', ID: r.id }, confirm: { title: 'Remover regra', body: r.name, danger: true, ok: 'Remover' } }).then(function () { dp.reload(true); }); } }]; } } });
        } },
        { id: 'bl', label: 'BitLocker e TPM', render: function (p) {
          var box = h('div', null, SN.loading());
          SN.api.query('bitlocker').then(function (d) {
            var t = d.tpm || {};
            SN.clear(box).append(h('div', { class: 'g2' }, card('TPM', SN.kv([['Presente', yesno(t.present, true)], ['Pronto', yesno(t.ready, true)], ['Habilitado', yesno(t.enabled, true)], ['Versão', t.version]])),
              card('Volumes', SN.table({ rows: d.volumes || [], search: false, cols: [{ k: 'mount', label: 'Volume', fmt: function (v) { return h('b', null, v); } }, { k: 'status', label: 'Estado', fmt: function (v) { return badge(v, /^FullyEncrypted$/, /Decrypted/); } }, { k: 'protection', label: 'Proteção' }, { k: 'pct', label: '% criptografado' }, { k: 'method', label: 'Método' }] }).el)));
          }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message)); });
          p.appendChild(box);
        } },
        { id: 'fail', label: 'Logins falhos', render: function (p) {
          var hours = 24, dp, sum = h('div', { class: 'row', style: { marginBottom: '10px' } });
          var sel = h('select', { class: 'inp', onchange: function () { hours = Number(sel.value); dp.reload(); } }, [[6, 'Últimas 6 h'], [24, 'Últimas 24 h'], [72, 'Últimos 3 dias'], [168, 'Últimos 7 dias']].map(function (o) { return h('option', { value: o[0], selected: o[0] === 24 }, o[1]); }));
          dp = SN.dataPage(p, { query: 'failed_logins', params: function () { return { HOURS: String(hours) }; }, toolbar: function () { return sel; }, onData: function (d, rows) {
            var by = {}; rows.forEach(function (r) { by[r.ip || '-'] = (by[r.ip || '-'] || 0) + 1; });
            var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 5);
            SN.clear(sum); sum.appendChild(h('span', { class: 'badge ' + (rows.length > 20 ? 'bad' : rows.length ? 'warn' : 'ok') }, rows.length + ' tentativas'));
            top.forEach(function (ip) { sum.appendChild(h('button', { class: 'tool-chip', title: 'Copiar IP', onclick: function () { SN.copy(ip); } }, ip + ' · ' + by[ip] + 'x')); });
          }, table: { exportName: 'logins_falhos', cols: [{ k: 'time', label: 'Quando', cls: 'mono' }, { k: 'user', label: 'Usuário', fmt: function (v) { return h('b', null, v); } }, { k: 'domain', label: 'Domínio' }, { k: 'logonType', label: 'Tipo' }, { k: 'workstation', label: 'Estação' }, { k: 'ip', label: 'IP de origem', cls: 'mono' }] }, note: 'Evento 4625 do log Security. Tipo 3 = rede, 10 = RDP, 2 = console. Muitas tentativas do mesmo IP externo indicam ataque de força bruta.' });
          p.insertBefore(sum, p.children[1]);
        } },
        { id: 'upd', label: 'Windows Update', render: function (p) {
          var box = h('div', null, SN.loading('Procurando atualizações (pode levar 1-2 minutos)...'));
          function load() {
            SN.clear(box).appendChild(SN.loading('Procurando atualizações...'));
            SN.api.query('updates').then(function (d) {
              if (d.ok === false) throw new Error(d.error || 'Falha');
              SN.clear(box).appendChild((d.updates || []).length ? SN.table({ rows: d.updates, exportName: 'atualizacoes_pendentes', cols: [{ k: 'title', label: 'Atualização', fmt: function (v) { return h('b', null, v); } }, { k: 'kb', label: 'KB' }, { k: 'sizeMB', label: 'Tamanho', sort: 'num', fmt: function (v) { return v + ' MB'; } }, { k: 'driver', label: 'Tipo', fmt: function (v) { return badge(v ? 'Driver' : 'Windows'); } }, { k: 'cats', label: 'Categoria' }] }).el : h('div', { class: 'empty' }, 'O Windows está atualizado.'));
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, load)); });
          }
          var hot = h('div');
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), 'Procurar'), h('button', { class: 'btn primary', onclick: function () { SN.act({ id: 'winupdate', name: 'Instalar atualizações do Windows', confirm: { title: 'Instalar atualizações', body: 'Instala todas as atualizações pendentes (usa o módulo PSWindowsUpdate). Pode demorar e pedir reinício.', ok: 'Instalar' } }); } }, 'Instalar todas'), h('button', { class: 'btn', onclick: function () { SN.launch('wu'); } }, 'Abrir Windows Update')), box, h('div', { class: 'grp-h' }, h('h4', null, 'Instaladas recentemente')), hot);
          load();
          SN.dataPage(hot, { query: 'hotfix', table: { exportName: 'hotfixes', sortBy: 'date', cols: [{ k: 'id', label: 'KB', fmt: function (v) { return h('b', null, v); } }, { k: 'desc', label: 'Tipo' }, { k: 'date', label: 'Instalada em' }, { k: 'by', label: 'Por' }] } });
        } }
      ], 'security');
    }
  });

  /* ================= USUARIOS ================= */
  SN.page('users', {
    title: 'Usuários', sub: 'Contas locais, administradores e senhas', icon: 'users',
    render: function (view) {
      var dp;
      var run = function (r, op, label, extra, danger) { SN.act({ id: 'user', name: label + ' ' + r.name, params: Object.assign({ OP: op, NAME: r.name }, extra || {}), confirm: danger ? { title: label, body: 'Conta: ' + r.name, danger: true, ok: label } : null }).then(function () { dp.reload(true); }); };
      var create = function () { SN.form({ title: 'Novo usuário local', ok: 'Criar', fields: [{ id: 'name', label: 'Nome de usuário', required: true }, { id: 'full', label: 'Nome completo' }, { id: 'pass', label: 'Senha', type: 'password', required: true }, { id: 'admin', label: 'Adicionar ao grupo Administradores', type: 'checkbox' }] }).then(function (v) { if (!v) return; SN.act({ id: 'user', name: 'Criar ' + v.name, params: { OP: 'create', NAME: v.name, FULL: v.full || v.name, PASS: v.pass, ADMIN: v.admin ? '1' : '0' } }).then(function () { dp.reload(true); }); }); };
      dp = SN.dataPage(view, { query: 'users', toolbar: function () { return h('button', { class: 'btn primary', onclick: create }, SN.icon('plus', 15), 'Novo usuário'); },
        table: { exportName: 'usuarios', cols: [{ k: 'name', label: 'Conta', fmt: function (v, r) { return h('div', null, h('b', null, v), r.fullName ? h('div', { class: 'faint', style: { fontSize: '11.5px' } }, r.fullName) : null); } }, { k: 'enabled', label: 'Estado', fmt: function (v) { return h('span', { class: 'badge ' + (v ? 'ok' : 'bad') }, v ? 'Ativa' : 'Desativada'); } }, { k: 'admin', label: 'Administrador', fmt: function (v) { return h('span', { class: 'badge ' + (v ? 'warn' : '') }, v ? 'Sim' : 'Não'); } }, { k: 'lastLogon', label: 'Último logon' }, { k: 'pwdExpires', label: 'Senha expira' }, { k: 'desc', label: 'Descrição' }],
          actions: function (r) { return [{ label: 'Redefinir senha', run: function () { SN.form({ title: 'Redefinir senha de ' + r.name, ok: 'Redefinir', fields: [{ id: 'pass', label: 'Nova senha', type: 'password', required: true }] }).then(function (v) { if (v) run(r, 'resetpw', 'Redefinir senha de', { PASS: v.pass }); }); } }, r.enabled ? { label: 'Desativar', run: function () { run(r, 'disable', 'Desativar', null, true); } } : { label: 'Ativar', run: function () { run(r, 'enable', 'Ativar'); } }, r.admin ? { label: 'Remover de admins', run: function () { run(r, 'unadmin', 'Remover de administradores', null, true); } } : { label: 'Tornar administrador', run: function () { run(r, 'admin', 'Tornar administrador', null, true); } }, { label: 'Excluir conta', danger: true, run: function () { run(r, 'delete', 'Excluir', null, true); } }]; } } });
      view.appendChild(h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: function () { SN.launch('lusrmgr'); } }, 'Usuários e grupos locais'), h('button', { class: 'btn', onclick: function () { SN.launch('netplwiz'); } }, 'Contas de usuário (netplwiz)')));
    }
  });

  /* ================= LOGS ================= */
  SN.page('logs', {
    title: 'Logs e diagnóstico', sub: 'Eventos do Windows, reinícios, telas azuis e histórico do SnowToolkit', icon: 'file',
    render: function (view) {
      SN.tabs(view, [
        { id: 'ev', label: 'Eventos', render: function (p) {
          var f = { LOG: 'System', LEVEL: '1,2', HOURS: '24', MAX: '300', IDS: '', PROVIDER: '' }, dp;
          var mk = function (key, opts) { var s = h('select', { class: 'inp', onchange: function () { f[key] = s.value; dp.reload(); } }, opts.map(function (o) { return h('option', { value: o[0], selected: f[key] === o[0] }, o[1]); })); return s; };
          var ids = h('input', { class: 'inp', placeholder: 'IDs: 41,1001', style: { width: '120px' }, onkeydown: function (e) { if (e.key === 'Enter') { f.IDS = ids.value.trim(); dp.reload(); } } });
          dp = SN.dataPage(p, { query: 'events', params: function () { return f; }, toolbar: function () { return [mk('LOG', [['System', 'Sistema'], ['Application', 'Aplicativo'], ['Security', 'Segurança'], ['Setup', 'Setup']]), mk('LEVEL', [['1,2', 'Crítico + Erro'], ['1,2,3', '+ Aviso'], ['1,2,3,4', 'Tudo']]), mk('HOURS', [['1', '1 h'], ['6', '6 h'], ['24', '24 h'], ['72', '3 dias'], ['168', '7 dias']]), ids]; },
            table: { exportName: 'eventos', placeholder: 'Filtrar por origem ou mensagem...', cols: [{ k: 'time', label: 'Quando', cls: 'mono nowrap' }, { k: 'level', label: 'Nível', fmt: function (v) { return badge(v, null, /Erro|Crítico/); } }, { k: 'id', label: 'ID', sort: 'num' }, { k: 'provider', label: 'Origem' }, { k: 'message', label: 'Mensagem', tip: false, fmt: function (v) { return h('span', { class: 'muted' }, (v || '').length > 140 ? v.slice(0, 140) + '…' : v); } }], actions: function (r) { return [{ label: 'Ver', run: function () { SN.modal({ title: 'Evento ' + r.id + ' · ' + r.provider, wide: true, body: [SN.kv([['Quando', r.time], ['Nível', r.level], ['ID', r.id], ['Origem', r.provider]]), h('pre', { class: 'snip', style: { whiteSpace: 'pre-wrap' } }, r.message)], actions: [{ label: 'Copiar', run: function () { SN.copy(r.message); return false; } }, { label: 'Fechar' }] }); } }, { label: 'Pesquisar ID na web', run: function () { SN.copy('Event ID ' + r.id + ' ' + r.provider, 'Termo de busca copiado'); } }]; }, onRow: function (r) { SN.modal({ title: 'Evento ' + r.id, wide: true, body: [h('pre', { class: 'snip', style: { whiteSpace: 'pre-wrap' } }, r.message)] }); } } });
        } },
        { id: 'boot', label: 'Reinícios', render: function (p) { SN.dataPage(p, { query: 'reboots', note: 'Eventos 6005/6006/41/1074/6008: quando e por que o computador ligou, desligou ou reiniciou.', table: { exportName: 'reinicios', cols: [{ k: 'time', label: 'Quando', cls: 'mono nowrap' }, { k: 'id', label: 'ID' }, { k: 'kind', label: 'Tipo', fmt: function (v) { return badge(v, null, /inesperado/i); } }, { k: 'message', label: 'Detalhes', tip: false }] } }); } },
        { id: 'bsod', label: 'Telas azuis', render: function (p) {
          var box = h('div', null, SN.loading());
          SN.api.query('bsod').then(function (d) {
            SN.clear(box).append(card('Eventos de bugcheck', SN.table({ rows: d.events || [], search: false, empty: 'Nenhuma tela azul registrada.', cols: [{ k: 'time', label: 'Quando', cls: 'mono nowrap' }, { k: 'message', label: 'Mensagem', tip: false }] }).el), h('div', { style: { height: '14px' } }), card('Minidumps (C:\\Windows\\Minidump)', SN.table({ rows: d.dumps || [], search: false, empty: 'Sem arquivos de dump.', cols: [{ k: 'name', label: 'Arquivo', cls: 'mono' }, { k: 'kb', label: 'Tamanho', fmt: function (v) { return v + ' KB'; } }, { k: 'time', label: 'Data' }] }).el), h('div', { class: 'note', style: { marginTop: '12px' } }, 'Para analisar um dump, use o WinDbg ou o WhoCrashed. O código (ex.: 0xD1) indica a classe do problema — geralmente driver.'));
          }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message)); });
          p.appendChild(box);
        } },
        { id: 'hist', label: 'Histórico do SnowToolkit', render: function (p) {
          var box = h('div', null, SN.loading());
          function load() {
            SN.api.get('/api/history').then(function (rows) {
              rows = (rows || []).map(function (r) { r.when = r.started ? new Date(r.started).toLocaleString('pt-BR') : ''; r.secs = r.ended && r.started ? Math.max(0, Math.round((new Date(r.ended) - new Date(r.started)) / 1000)) : 0; return r; });
              SN.clear(box).appendChild(SN.table({ rows: rows, exportName: 'historico', empty: 'Nenhuma execução registrada ainda.', cols: [
                { k: 'when', label: 'Quando', cls: 'nowrap', sortable: false }, { k: 'name', label: 'Tarefa', fmt: function (v) { return h('b', null, v); } }, { k: 'secs', label: 'Duração', sort: 'num', fmt: function (v) { return v + ' s'; } },
                { k: 'exit', label: 'Resultado', fmt: function (v, r) { return r.cancelled ? h('span', { class: 'badge warn' }, 'Cancelado') : h('span', { class: 'badge ' + (v === 0 ? 'ok' : 'bad') }, v === 0 ? 'OK' : 'Código ' + v); } }],
                actions: function (r) { return [{ label: 'Ver log', run: function () { fetch('/api/history/log?f=' + encodeURIComponent(r.log)).then(function (x) { return x.text(); }).then(function (t) { SN.modal({ title: r.name, wide: true, body: [h('pre', { class: 'snip', style: { whiteSpace: 'pre-wrap', maxHeight: '60vh' } }, t)], actions: [{ label: 'Copiar', run: function () { SN.copy(t); return false; } }, { label: 'Fechar' }] }); }); } }]; } }).el);
            }).catch(function (e) { SN.clear(box).appendChild(SN.errBox(e.message, load)); });
          }
          p.append(h('div', { class: 'row', style: { marginBottom: '12px' } }, h('button', { class: 'btn', onclick: load }, SN.icon('refresh', 15), 'Atualizar'), h('button', { class: 'btn', onclick: function () { SN.api.post('/api/open', { path: '@logs' }); } }, 'Abrir pasta de logs')), box);
          load();
        } }
      ], 'logs');
    }
  });

  /* ================= IMPRESSORAS ================= */
  SN.page('printers', {
    title: 'Impressoras', sub: 'Filas, impressora padrão e instalação por IP', icon: 'printer',
    render: function (view) {
      var dp;
      var run = function (r, op, label, danger) { SN.act({ id: 'printer', name: label + ': ' + r.name, params: { OP: op, NAME: r.name }, confirm: danger ? { title: label, body: r.name, danger: true, ok: label } : null }).then(function () { dp.reload(true); }); };
      var add = function () { SN.form({ title: 'Adicionar impressora de rede', ok: 'Adicionar', intro: 'O driver precisa estar instalado no Windows (o nome deve ser exatamente o do driver).', fields: [{ id: 'name', label: 'Nome', required: true }, { id: 'ip', label: 'IP da impressora', required: true, placeholder: '10.0.0.80' }, { id: 'driver', label: 'Nome do driver', required: true, placeholder: 'HP Universal Printing PCL 6' }] }).then(function (v) { if (!v) return; SN.act({ id: 'printer', name: 'Adicionar ' + v.name, params: { OP: 'add', NAME: v.name, IP: v.ip, DRIVER: v.driver } }).then(function () { dp.reload(true); }); }); };
      dp = SN.dataPage(view, { query: 'printers', toolbar: function () { return [h('button', { class: 'btn primary', onclick: add }, SN.icon('plus', 15), 'Adicionar'), h('button', { class: 'btn', onclick: function () { SN.act({ id: 'printer', name: 'Limpar fila de impressão', params: { OP: 'clear' }, confirm: { title: 'Limpar fila de impressão', body: 'Para o spooler, apaga todos os trabalhos pendentes e reinicia o serviço.', ok: 'Limpar' } }).then(function () { dp.reload(true); }); } }, 'Limpar fila e reiniciar spooler'), h('button', { class: 'btn', onclick: function () { SN.launch('printmgmt'); } }, 'Gerenciar impressão')]; },
        table: { exportName: 'impressoras', cols: [{ k: 'name', label: 'Impressora', fmt: function (v) { return h('b', null, v); } }, { k: 'driver', label: 'Driver' }, { k: 'port', label: 'Porta', cls: 'mono' }, { k: 'status', label: 'Estado', fmt: function (v) { return badge(v, /normal/i, /error|offline/i); } }, { k: 'shared', label: 'Compartilhada', fmt: function (v) { return v ? 'Sim' : 'Não'; } }, { k: 'jobs', label: 'Na fila', sort: 'num' }], actions: function (r) { return [{ label: 'Página de teste', run: function () { run(r, 'testpage', 'Página de teste'); } }, { label: 'Tornar padrão', run: function () { run(r, 'default', 'Definir padrão'); } }, { label: 'Remover', danger: true, run: function () { run(r, 'remove', 'Remover', true); } }]; } } });
    }
  });

  /* ================= TERMINAL ================= */
  SN.page('terminal', {
    title: 'Terminal PowerShell', sub: 'Execute comandos como administrador; a saída aparece no console', icon: 'term',
    render: function (view) {
      var ta = h('textarea', { class: 'inp mono', rows: 9, spellcheck: 'false', placeholder: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 10', style: { width: '100%', fontFamily: 'var(--f-mono)' } });
      var hist = SN.store.get('termHistory', []), histBox = h('div');
      function drawHist() { SN.clear(histBox); if (!hist.length) return; histBox.appendChild(h('div', { class: 'grp-h' }, h('h4', null, 'Recentes'))); hist.slice(0, 12).forEach(function (c) { histBox.appendChild(h('div', { class: 'row', style: { marginBottom: '6px', flexWrap: 'nowrap' } }, h('button', { class: 'linkbtn', style: { textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }, onclick: function () { ta.value = c; ta.focus(); } }, c.replace(/\s+/g, ' ').slice(0, 140)))); }); }
      function run() {
        var code = ta.value.trim(); if (!code) return;
        hist = [code].concat(hist.filter(function (x) { return x !== code; })).slice(0, 30); SN.store.set('termHistory', hist); drawHist();
        SN.runScript('PowerShell: ' + code.split('\n')[0].slice(0, 40), code);
      }
      ta.addEventListener('keydown', function (e) { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); run(); } });
      var snippets = [['Top CPU', 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,Id,CPU,@{n="MB";e={[int]($_.WS/1MB)}} | Format-Table -AutoSize | Out-String -Width 160'], ['Discos', 'Get-PhysicalDisk | Select FriendlyName,MediaType,HealthStatus,@{n="GB";e={[int]($_.Size/1GB)}} | Format-Table -AutoSize'], ['IPs', 'Get-NetIPAddress -AddressFamily IPv4 | Select InterfaceAlias,IPAddress,PrefixLength | Format-Table -AutoSize'], ['Portas escutando', 'Get-NetTCPConnection -State Listen | Sort-Object LocalPort | Select LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize'], ['Últimos erros', 'Get-WinEvent -FilterHashtable @{LogName="System";Level=1,2;StartTime=(Get-Date).AddHours(-24)} -MaxEvents 20 | Select TimeCreated,Id,ProviderName | Format-Table -AutoSize'], ['Licença Windows', 'cscript //nologo C:\\Windows\\System32\\slmgr.vbs /dli']];
      view.append(h('div', { class: 'note warn', style: { marginBottom: '12px' } }, 'Executa com os privilégios do SnowToolkit (administrador). Revise o comando antes de rodar — não há desfazer.'), ta,
        h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn primary', onclick: run }, SN.icon('play', 15), 'Executar (Ctrl+Enter)'), h('button', { class: 'btn', onclick: function () { ta.value = ''; ta.focus(); } }, 'Limpar'), h('span', { class: 'sp' }), snippets.map(function (s) { return h('button', { class: 'tool-chip', onclick: function () { ta.value = s[1]; ta.focus(); } }, s[0]); })), histBox);
      drawHist(); ta.focus();
    }
  });

  /* ================= ATALHOS ================= */
  SN.page('shortcuts', {
    title: 'Atalhos do Windows', sub: 'Consoles e painéis administrativos em um clique', icon: 'grid',
    render: function (view) {
      var G = [['Sistema', [['msinfo32', 'Informações do sistema'], ['sysdm', 'Propriedades do sistema'], ['msconfig', 'Configuração do sistema'], ['taskmgr', 'Gerenciador de tarefas'], ['resmon', 'Monitor de recursos'], ['perfmon', 'Monitor de desempenho'], ['winver', 'Versão do Windows'], ['rstrui', 'Restauração do sistema']]],
        ['Gerenciamento', [['compmgmt', 'Gerenciamento do computador'], ['devmgmt', 'Gerenciador de dispositivos'], ['diskmgmt', 'Gerenciamento de disco'], ['services', 'Serviços'], ['eventvwr', 'Visualizador de eventos'], ['taskschd', 'Agendador de tarefas'], ['lusrmgr', 'Usuários e grupos locais'], ['certmgr', 'Certificados']]],
        ['Políticas e segurança', [['gpedit', 'Política de grupo local'], ['secpol', 'Política de segurança local'], ['wf', 'Firewall avançado'], ['firewall', 'Firewall (painel)'], ['regedit', 'Editor do Registro']]],
        ['Rede e acesso', [['ncpa', 'Conexões de rede'], ['mstsc', 'Área de trabalho remota'], ['ncsi', 'Status da rede (Configurações)'], ['printmgmt', 'Gerenciar impressão']]],
        ['Programas e discos', [['appwiz', 'Programas e recursos'], ['cleanmgr', 'Limpeza de disco'], ['dfrgui', 'Otimizar unidades'], ['powercfg', 'Opções de energia'], ['control', 'Painel de controle'], ['devices', 'Configurações (dispositivos)'], ['wu', 'Windows Update']]],
        ['Terminais', [['cmd', 'Prompt de comando'], ['powershell', 'PowerShell']]]];
      G.forEach(function (g) { view.append(h('div', { class: 'grp-h' }, h('h4', null, g[0])), h('div', { class: 'qa' }, g[1].map(function (t) { return h('button', { onclick: function () { SN.launch(t[0]); } }, h('b', null, t[1]), h('span', { class: 'mono' }, t[0])); }))); });
    }
  });

  /* ================= RELATORIOS ================= */
  SN.page('reports', {
    title: 'Relatórios', sub: 'Inventário da máquina e pasta de logs', icon: 'clip',
    render: function (view) {
      view.append(h('div', { class: 'rep' },
        card(null, h('div', null, h('h3', null, 'Inventário em HTML'), h('p', null, 'Relatório visual completo: hardware, sistema, discos, rede, programas e atualizações. Salvo na Área de Trabalho.')), { cls: '' }),
        card(null, h('div', null, h('h3', null, 'Inventário em CSV'), h('p', null, 'Lista de programas e dados em planilha, ideal para controle de patrimônio.'))),
        card(null, h('div', null, h('h3', null, 'Inventário completo (HTML + CSV)'), h('p', null, 'Gera os dois formatos de uma vez.'))),
        card(null, h('div', null, h('h3', null, 'Logs do SnowToolkit'), h('p', null, 'Cada execução é registrada com a saída completa em ' + (SN.about.dataDir || '%ProgramData%\\SnowToolkit') + '\\logs.')))));
      var cs = view.querySelectorAll('.rep .card');
      [['html'], ['csv'], ['both']].forEach(function (f, i) { cs[i].appendChild(h('div', { style: { marginTop: '12px' } }, h('button', { class: 'btn primary', onclick: function () { SN.act({ id: 'inventory', name: 'Inventário ' + f[0].toUpperCase(), params: { FORMAT: f[0] } }); } }, SN.icon('play', 14), 'Gerar'))); });
      cs[3].appendChild(h('div', { style: { marginTop: '12px' } }, h('button', { class: 'btn', onclick: function () { SN.api.post('/api/open', { path: '@logs' }).catch(function (e) { SN.toast(e.message, 'bad'); }); } }, 'Abrir pasta de logs')));
    }
  });

  /* ================= SOBRE ================= */
  SN.page('about', {
    title: 'Sobre e configurações', sub: 'Versão, privacidade e atalhos de teclado', icon: 'info',
    render: function (view) {
      var a = SN.about;
      view.append(h('div', { class: 'g2' },
        card('SnowToolkit', SN.kv([['Versão', a.version], ['Executando como administrador', a.admin ? h('span', { class: 'badge ok' }, 'Sim') : h('span', { class: 'badge warn' }, 'Não — muitas ações vão falhar')], ['Pasta de dados', h('span', { class: 'mono' }, a.dataDir)], ['Modo demonstração', a.demo ? 'Sim (dados fictícios)' : 'Não'], ['Servidor local', '127.0.0.1:' + a.port + ' (somente esta máquina, com token)']])),
        card('Privacidade e segurança', h('ul', { class: 'muted', style: { margin: 0, paddingLeft: '18px', lineHeight: 1.7 } }, h('li', null, 'Nada sai do computador: a interface conversa só com um servidor local protegido por token.'), h('li', null, 'Senhas das ações remotas ficam apenas em memória.'), h('li', null, 'Os logs de execução ficam em ' + (a.dataDir || 'ProgramData') + '\\logs.'), h('li', null, 'Os parâmetros dos comandos chegam ao PowerShell por variáveis de ambiente, nunca montados no texto do script.'))),
        card('Atalhos de teclado', SN.kv([['Ctrl + K', 'Buscar páginas e ações'], ['Ctrl + `', 'Mostrar/ocultar console'], ['Esc', 'Fechar janelas']])),
        card('Por que "Snow"?', h('p', { class: 'muted', style: { margin: 0, lineHeight: 1.7 } }, 'O nome é uma homenagem ao Snow, o cachorro do Gui — tudo que ele faz leva o nome dele. \u2744\uFE0F\uD83D\uDC15')),
        card('Ferramentas', h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { SN.api.post('/api/open', { path: '@logs' }); } }, 'Abrir pasta de logs'), h('button', { class: 'btn danger', onclick: function () { SN.confirm({ title: 'Encerrar SnowToolkit', body: 'Fecha o aplicativo. Trabalhos em andamento serão cancelados.', danger: true, ok: 'Encerrar' }).then(function (y) { if (y) SN.api.post('/api/shutdown').then(function () { document.body.innerHTML = '<div style="padding:40px;font:16px sans-serif;color:#ccc">SnowToolkit encerrado. Você pode fechar esta janela.</div>'; }); }); } }, 'Encerrar aplicativo')))));
    }
  });
})();
