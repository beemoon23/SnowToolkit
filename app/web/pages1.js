'use strict';
/* Painel, Reparo. (Otimizar fica em optimize.js) */
(function () {
  var SN = window.SN, h = SN.h;

  // ---------- grafico de linha minimo ----------
  SN.spark = function (values, max, color) {
    var w = 200, hgt = 46, n = values.length;
    var m = max || Math.max.apply(null, values.concat([1]));
    var pts = values.map(function (v, i) { return [(n <= 1 ? 0 : i / (n - 1)) * w, hgt - 3 - Math.min(1, v / m) * (hgt - 6)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = d + ' L' + w + ' ' + hgt + ' L0 ' + hgt + ' Z';
    var c = color || 'var(--accent)';
    var box = h('div', { html: '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none"><path d="' + area + '" fill="' + c + '" opacity=".13"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>' });
    return box.firstChild;
  };
  SN.ring = function (pct, label, color) {
    var r = 46, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    var box = h('div', { class: 'ring' });
    box.innerHTML = '<svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="9"/><circle cx="56" cy="56" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
    box.appendChild(h('b', null, label));
    return box;
  };
  SN.ic = function (kind) { return h('div', { class: 'ic ' + kind }, kind === 'ok' ? '✓' : kind === 'bad' ? '!' : kind === 'warn' ? '!' : 'i'); };

  // ---------- avaliacao de saude ----------
  function evaluate(d) {
    var items = [], score = 100;
    function add(kind, title, detail, penalty, go) { items.push({ kind: kind, title: title, detail: detail, go: go }); if (kind !== 'ok') score -= penalty; }
    if (d.pendingReboot) add('warn', 'Reinício pendente', (d.pendingReasons || []).join(', ') || 'Há alterações aguardando reinício', 6, ['repair']); else add('ok', 'Sem reinício pendente', '');
    var df = d.defender || {};
    if (!df.enabled) add('bad', 'Microsoft Defender desativado', 'Sem antivírus ativo detectado', 18, ['security']);
    else if (!df.realtime) add('bad', 'Proteção em tempo real desligada', '', 14, ['security']);
    else if (df.sigAgeDays > 7) add('warn', 'Definições do antivírus desatualizadas', df.sigAgeDays + ' dias', 8, ['security']);
    else add('ok', 'Antivírus ativo e atualizado', df.lastQuick ? 'Última verificação rápida: ' + df.lastQuick : '');
    var fwOff = (d.firewall || []).filter(function (f) { return !f.enabled; });
    if (fwOff.length) add('warn', 'Firewall desligado em: ' + fwOff.map(function (f) { return f.name; }).join(', '), '', 8, ['security']); else add('ok', 'Firewall ativo em todos os perfis', '');
    if (d.lastUpdateDays != null) {
      if (d.lastUpdateDays > 60) add('bad', 'Sem atualizações há ' + d.lastUpdateDays + ' dias', 'Instale as atualizações do Windows', 12, ['security']);
      else if (d.lastUpdateDays > 35) add('warn', 'Última atualização há ' + d.lastUpdateDays + ' dias', '', 6, ['security']);
      else add('ok', 'Atualizações em dia', 'Última há ' + d.lastUpdateDays + ' dias');
    }
    (d.disks || []).forEach(function (k) { if (k.health && k.health !== 'Healthy') add('bad', 'Disco com problema: ' + k.name, 'Estado: ' + k.health, 16, ['storage']); });
    if (!(d.disks || []).some(function (k) { return k.health && k.health !== 'Healthy'; })) add('ok', 'Discos físicos saudáveis', '');
    (d.volumes || []).forEach(function (v) {
      if (v.freePct < 10) add('bad', 'Disco ' + v.letter + ': quase cheio', v.freeGB + ' GB livres (' + v.freePct + '%)', 12, ['storage']);
      else if (v.freePct < 20) add('warn', 'Pouco espaço no disco ' + v.letter + ':', v.freeGB + ' GB livres (' + v.freePct + '%)', 5, ['storage']);
    });
    if ((d.failedServices || []).length) add('warn', 'Serviços automáticos parados', d.failedServices.join(', '), 4, ['system']);
    if (d.smb1) add('warn', 'SMB1 habilitado', 'Protocolo antigo e inseguro', 5, ['optimize']);
    if (d.rdp) add('info', 'Área de trabalho remota habilitada', 'Confirme se é intencional', 0);
    (d.bitlocker || []).forEach(function (b) { if (b.status === 'Off' && /^[A-Z]:$/.test(b.mount) && b.mount === 'C:') add('info', 'BitLocker desligado no C:', 'Sem criptografia de disco', 0, ['security']); });
    if (d.admins > 3) add('warn', d.admins + ' administradores locais', 'Revise quem precisa de privilégio', 3, ['users']);
    return { score: Math.max(0, Math.min(100, score)), items: items };
  }

  /* ================= PAINEL ================= */
  SN.page('dashboard', {
    title: 'Painel', sub: 'Visão geral deste computador em tempo real', icon: 'dash',
    render: function (view) {
      var N = 60, hist = { cpu: [], mem: [], rx: [], tx: [] };
      var cpuS = stat('Processador'), memS = stat('Memória'), netS = stat('Rede'), upS = stat('Tempo ligado');
      function stat(lbl) { var o = { val: h('div', { class: 'val' }, '—'), sub: h('div', { class: 'sub' }, ' '), g: h('div'), lbl: lbl }; o.el = h('div', { class: 'card stat' }, h('div', { class: 'lbl' }, lbl), o.val, o.sub, o.g); return o; }
      var disksBox = h('div', { class: 'stack', style: { gap: '12px' } }, SN.loading());
      var healthBox = h('div', null, SN.loading('Avaliando saúde do sistema...'));
      var infoBox = h('div', null, SN.loading());
      function push(a, v) { a.push(v); if (a.length > N) a.shift(); }
      function draw(o, arr, max, color) { var s = SN.spark(arr, max, color); if (o.g.firstChild) o.g.replaceChild(s, o.g.firstChild); else o.g.appendChild(s); }
      function tick() {
        SN.api.get('/api/metrics').then(function (m) {
          push(hist.cpu, m.cpu); push(hist.mem, m.memPct); push(hist.rx, m.rxBps); push(hist.tx, m.txBps);
          cpuS.val.innerHTML = Math.round(m.cpu) + '<small>%</small>'; cpuS.sub.textContent = 'uso total';
          memS.val.innerHTML = Math.round(m.memPct) + '<small>%</small>'; memS.sub.textContent = m.memUsedGB.toFixed(1) + ' de ' + m.memTotalGB.toFixed(1) + ' GB';
          netS.val.innerHTML = '↓ ' + SN.fmtRate(m.rxBps); netS.sub.textContent = '↑ ' + SN.fmtRate(m.txBps) + ' enviando';
          upS.val.textContent = SN.fmtUptime(m.uptimeSec); upS.sub.textContent = 'desde o último boot';
          draw(cpuS, hist.cpu, 100, 'var(--accent)'); draw(memS, hist.mem, 100, 'var(--accent-2)');
          draw(netS, hist.rx, Math.max(100000, Math.max.apply(null, hist.rx.concat(hist.tx)) * 1.15), 'var(--ok)');
          var box = SN.clear(disksBox);
          (m.disks || []).forEach(function (d) {
            var used = d.totalGB - d.freeGB, pct = d.totalGB ? used / d.totalGB * 100 : 0;
            box.appendChild(h('div', { class: 'disk' }, h('div', { class: 'top' }, h('b', null, d.letter + ':'), h('span', { class: 'muted' }, d.freeGB.toFixed(0) + ' GB livres de ' + d.totalGB.toFixed(0) + ' GB')),
              h('div', { class: 'bar' + (pct > 92 ? ' bad' : pct > 80 ? ' warn' : '') }, h('i', { style: { width: pct.toFixed(1) + '%' } }))));
          });
        }).catch(function () { });
      }
      tick(); var t = setInterval(tick, 2000); SN.onLeave(function () { clearInterval(t); });

      function loadHealth() {
        SN.clear(healthBox).appendChild(SN.loading('Avaliando saúde do sistema...'));
        SN.api.query('health').then(function (d) {
          var ev = evaluate(d), col = ev.score >= 85 ? 'var(--ok)' : ev.score >= 60 ? 'var(--warn)' : 'var(--bad)';
          var bad = ev.items.filter(function (i) { return i.kind !== 'ok'; }), good = ev.items.filter(function (i) { return i.kind === 'ok'; });
          var list = h('div');
          bad.concat(good).forEach(function (i) {
            list.appendChild(h('div', { class: 'chk-i' }, SN.ic(i.kind), h('div', null, h('b', null, i.title), i.detail ? h('small', null, i.detail) : null),
              i.go ? null : null));
          });
          SN.clear(healthBox).append(h('div', { class: 'row', style: { gap: '18px', alignItems: 'center', marginBottom: '8px' } },
            SN.ring(ev.score, ev.score, col),
            h('div', null, h('div', { style: { fontSize: '18px', fontWeight: 700 } }, ev.score >= 85 ? 'Sistema saudável' : ev.score >= 60 ? 'Atenção recomendada' : 'Precisa de cuidados'),
              h('div', { class: 'muted' }, bad.length ? bad.length + ' ponto(s) de atenção encontrados' : 'Nenhum problema detectado'))), list);
        }).catch(function (e) { SN.clear(healthBox).appendChild(SN.errBox(e.message, loadHealth)); });
      }
      function loadInfo() {
        SN.api.query('sysinfo').then(function (s) {
          SN.clear(infoBox).appendChild(SN.kv([
            ['Computador', s.host], ['Usuário', s.user], ['Domínio / grupo', (s.partOfDomain ? 'Domínio ' : 'Grupo ') + s.domain],
            ['Fabricante / modelo', (s.maker || '') + ' ' + (s.model || '')], ['Nº de série', s.serial], ['BIOS', (s.biosVersion || '') + (s.biosDate ? ' (' + s.biosDate + ')' : '')],
            ['Sistema', (s.os || '') + ' · build ' + (s.build || '') + ' · ' + (s.arch || '')], ['Instalado em', s.installDate], ['Ativação', s.activation],
            ['Processador', s.cpu + ' (' + s.cores + 'N/' + s.threads + 'T)'], ['Memória', s.ramGB + ' GB' + ((s.ram || []).length ? ' — ' + s.ram.map(function (r) { return r.gb + 'GB ' + (r.mhz || '') + 'MHz'; }).join(' + ') : '')],
            ['Vídeo', (s.gpu || []).join('; ')], ['Secure Boot / TPM', (s.secureBoot || '—') + ' / ' + (s.tpm || '—')],
            ['Rede', (s.net || []).map(function (n) { return n.nic + ' ' + n.ip; }).join(' · ')]
          ]));
          SN.about.host = s.host; var hb = SN.$('#host-badge'); if (hb) hb.textContent = s.host;
        }).catch(function (e) { SN.clear(infoBox).appendChild(SN.errBox(e.message, loadInfo)); });
      }
      loadHealth(); loadInfo();

      var qa = [
        ['Ponto de restauração', 'Cria um checkpoint antes de mexer', function () { SN.act({ id: 'restore_point', name: 'Ponto de restauração', params: { NAME: 'SnowToolkit ' + new Date().toLocaleDateString('pt-BR') } }); }],
        ['Limpeza rápida', 'Temporários, cache e lixeira', function () { SN.act({ id: 'cleanup', name: 'Limpeza rápida', params: { MODE: 'quick' }, confirm: { title: 'Limpeza rápida', body: 'Remove arquivos temporários, cache do Windows Update e esvazia a lixeira.', ok: 'Limpar' } }); }],
        ['Reparar o Windows', 'DISM + SFC', function () { SN.act({ id: 'repair', name: 'DISM + SFC', params: { WHAT: 'full' }, confirm: { title: 'Reparar arquivos do Windows', body: 'Executa DISM /RestoreHealth e SFC /scannow. Pode levar de 10 a 40 minutos.', ok: 'Iniciar' } }); }],
        ['Limpar DNS e renovar IP', 'Resolve problemas de conexão', function () { SN.act({ id: 'repair', name: 'Rede: DNS e IP', params: { WHAT: 'netreset' } }); }],
        ['Verificar atualizações', 'Windows Update e drivers', function () { SN.go('security'); }],
        ['Inventário HTML', 'Relatório completo do PC', function () { SN.act({ id: 'inventory', name: 'Inventário', params: { FORMAT: 'html' } }); }]
      ];
      var tools = [['Gerenciador de dispositivos', 'devmgmt'], ['Serviços', 'services'], ['Visualizador de eventos', 'eventvwr'], ['Gerenciamento de disco', 'diskmgmt'], ['Task Manager', 'taskmgr'], ['Informações do sistema', 'msinfo32'], ['Programas e recursos', 'appwiz'], ['Editor do Registro', 'regedit']];

      view.append(
        h('div', { class: 'g4' }, cpuS.el, memS.el, netS.el, upS.el),
        h('div', { class: 'g2', style: { marginTop: '14px' } },
          SN.card('Saúde do sistema', healthBox, { right: h('button', { class: 'btn sm ghost', onclick: loadHealth }, SN.icon('refresh', 14), 'Reavaliar') }),
          h('div', { class: 'stack' }, SN.card('Armazenamento', disksBox), SN.card('Ações rápidas', h('div', { class: 'qa' }, qa.map(function (q) { return h('button', { onclick: q[2] }, h('b', null, q[0]), h('span', null, q[1])); }))))),
        h('div', { class: 'g2', style: { marginTop: '14px' } },
          SN.card('Este computador', infoBox),
          SN.card('Atalhos do Windows', h('div', { class: 'row', style: { gap: '8px' } }, tools.map(function (t) { return h('button', { class: 'tool-chip', onclick: function () { SN.launch(t[1]); } }, t[0]); })))));
    }
  });

  /* ================= REPARO ================= */
  var REPAIRS = [
    { g: 'Arquivos do sistema', items: [
      ['dism', 'DISM RestoreHealth', 'Repara a imagem do Windows usando o Windows Update como fonte.', 'Pode levar de 5 a 30 minutos.'],
      ['sfc', 'SFC /scannow', 'Verifica e substitui arquivos de sistema corrompidos.', ''],
      ['full', 'Reparo completo (DISM + SFC)', 'Sequência recomendada para erros misteriosos, telas azuis e apps que não abrem.', 'Pode levar de 10 a 40 minutos.'],
      ['components', 'Limpar componentes antigos (WinSxS)', 'Remove versões substituídas de componentes e libera espaço.', ''],
      ['wmi', 'Reparar repositório WMI', 'Corrige falhas de consultas e de ferramentas de inventário.', ''] ] },
    { g: 'Disco', items: [
      ['chkdsk_scan', 'CHKDSK (somente leitura)', 'Analisa o volume do sistema online, sem corrigir nada.', ''],
      ['chkdsk_fix', 'CHKDSK /F /R (agendar no boot)', 'Agenda correção de erros e setores ruins para o próximo reinício.', 'Pede reinício; pode demorar horas.'] ] },
    { g: 'Windows Update e Store', items: [
      ['wureset', 'Resetar o Windows Update', 'Para serviços, limpa SoftwareDistribution/catroot2 e reinicia tudo. Resolve erros de atualização travada.', ''],
      ['storereset', 'Resetar a Microsoft Store', 'Executa wsreset e limpa o cache da loja.', ''] ] },
    { g: 'Rede', items: [
      ['netreset', 'Resetar a pilha de rede', 'Winsock, TCP/IP, DNS e renovação de IP. Pode exigir reinício.', 'Derruba a conexão por instantes.'],
      ['dnsflush', 'Limpar cache DNS', 'Resolve sites que não carregam por cache incorreto.', ''],
      ['iprenew', 'Renovar IP (DHCP)', 'Libera e renova o endereço nas placas.', ''] ] },
    { g: 'Interface e serviços', items: [
      ['explorer', 'Reiniciar o Explorer', 'Recarrega barra de tarefas, menu iniciar e área de trabalho.', ''],
      ['icons', 'Reconstruir cache de ícones e miniaturas', 'Corrige ícones em branco ou errados.', ''],
      ['spooler', 'Reiniciar a fila de impressão', 'Para o spooler, apaga trabalhos presos e liga de novo.', ''],
      ['timesync', 'Ressincronizar a hora', 'Reconfigura o serviço de hora e força sincronização.', ''],
      ['gpupdate', 'Atualizar políticas de grupo', 'gpupdate /force.', ''] ] }
  ];
  SN.page('repair', {
    title: 'Reparo', sub: 'Correções para os problemas mais comuns de suporte', icon: 'tool',
    render: function (view) {
      var q = h('input', { class: 'inp', type: 'search', placeholder: 'Filtrar reparos...' }), box = h('div');
      function draw() {
        var f = q.value.toLowerCase(); SN.clear(box);
        REPAIRS.forEach(function (grp) {
          var items = grp.items.filter(function (i) { return !f || (i[1] + ' ' + i[2]).toLowerCase().indexOf(f) >= 0; });
          if (!items.length) return;
          box.appendChild(h('div', { class: 'grp-h' }, h('h4', null, grp.g)));
          box.appendChild(h('div', { class: 'rep' }, items.map(function (i) {
            return h('div', { class: 'card' }, h('div', null, h('h3', null, i[1]), h('p', null, i[2]), i[3] ? h('p', { class: 'faint' }, i[3]) : null),
              h('div', null, h('button', { class: 'btn primary', onclick: function () { SN.act({ id: 'repair', name: i[1], params: { WHAT: i[0] }, confirm: { title: i[1], body: i[2], warn: i[3] || null, ok: 'Executar' } }); } }, SN.icon('play', 14), 'Executar')));
          })));
        });
        if (!box.firstChild) box.appendChild(h('div', { class: 'empty' }, 'Nenhum reparo encontrado.'));
      }
      q.addEventListener('input', draw);
      view.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, q,
        h('button', { class: 'btn', onclick: function () { SN.act({ id: 'restore_point', name: 'Ponto de restauração', params: { NAME: 'SnowToolkit manual' } }); } }, 'Criar ponto de restauração'),
        h('button', { class: 'btn', onclick: function () { SN.act({ id: 'winupdate', name: 'Windows Update' }); } }, 'Instalar atualizações do Windows')), box);
      draw();
    }
  });
})();
