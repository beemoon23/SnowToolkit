
  /* ---------- ESTADO ---------- */
  window.SNOW_APPGROUPS = APPGROUPS;
  var byId = {};
  ITEMS.forEach(function (i) { byId[i.id] = i; });
  var state = { tab: 'priv', sel: new Set(), restore: true, sim: false, mode: 'apply', q: '', open: {} };
  var PRESETS = [['r', 'Recomendado', 'Equilíbrio entre privacidade, desempenho e funcionalidade.'], ['s', 'Estrito', 'Foco forte em privacidade e desempenho; desliga recursos não essenciais.'], ['e', 'Extremo', 'Não recomendado: quebra recursos. Use só sabendo o que faz.'], ['g', 'Gamer', 'Jogos e baixa latência.'], ['t', 'Técnico', 'Estação de suporte/TI.'], ['m', 'Mínimo', 'Só o essencial e mais seguro.'], ['x', 'Limpar', 'Desmarca tudo.']];
  // Estrito inclui o Recomendado; Extremo inclui os dois.
  var PRESET_SETS = { r: 'r', s: 'rs', e: 'rse', g: 'g', t: 't', m: 'm' };
  function applyPreset(k) {
    state.sel = new Set();
    if (k === 'x') return;
    var set = PRESET_SETS[k] || k;
    ITEMS.forEach(function (i) { for (var n = 0; n < set.length; n++) { if (i.p.indexOf(set.charAt(n)) >= 0) { state.sel.add(i.id); break; } } });
    var seen = {};
    ITEMS.forEach(function (i) { if (i.radio && state.sel.has(i.id)) { if (seen[i.radio]) state.sel.delete(i.id); else seen[i.radio] = 1; } });
  }
  var loaded = false;
  function loadState() {
    if (loaded) return; loaded = true;
    var s = SN.store.get('optimize', null);
    if (s && Array.isArray(s.sel)) {
      state.sel = new Set(s.sel.filter(function (id) { return byId[id]; }));
      state.restore = s.restore !== false; state.sim = !!s.sim; state.mode = s.mode === 'undo' ? 'undo' : 'apply';
    } else applyPreset('r');
  }
  function persist() { SN.store.set('optimize', { sel: Array.from(state.sel), restore: state.restore, sim: state.sim, mode: state.mode }); }

  /* ---------- GERADOR ---------- */
  function ascii(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?'); }
  function q1(s) { return ascii(s).replace(/'/g, "''"); }
  function indent(code) { return code.split('\n').map(function (l) { return '    ' + l; }).join('\n'); }
  var HEADER_FN = [
    "function Set-Reg($Path, $Name, $Value, $Type = 'DWord') {",
    "    if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }",
    "    Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -Force -ErrorAction Stop",
    "}",
    "function Remove-Reg($Path, $Name) { Remove-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue }",
    "function Invoke-Step([string]$Name, [scriptblock]$Action) {",
    "    Write-Host ''",
    "    Write-Host ('>> ' + $Name) -ForegroundColor Cyan",
    "    if ($Simulate) { Write-Host '   (simulacao: nada foi alterado)' -ForegroundColor DarkYellow; return }",
    "    try { & $Action; Write-Host '   OK' -ForegroundColor Green }",
    "    catch { Write-Host ('   ERRO: ' + $_.Exception.Message) -ForegroundColor Red }",
    "}"
  ].join('\n');
  var REMOVE_APP_FN = [
    "function Remove-App([string[]]$Names) {",
    "    foreach ($n in $Names) {",
    "        Get-AppxPackage -AllUsers -Name $n -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue",
    "        Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object DisplayName -like $n | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Out-Null",
    "        Write-Host ('   removido: ' + $n) -ForegroundColor DarkGray",
    "    }",
    "}"
  ].join('\n');

  // gui=true: script executado pelo app (o prelude ja traz as funcoes e a elevacao).
  function build(mode) {
    var gui = mode === true, auto = mode === 'auto';
    var undo = state.mode === 'undo';
    var sel = ITEMS.filter(function (i) { return state.sel.has(i.id); });
    var tweaks = sel.filter(function (i) { return i.cat !== 'apps'; });
    var apps = sel.filter(function (i) { return i.cat === 'apps'; });
    var act = undo ? tweaks.filter(function (i) { return i.undo; }) : tweaks;
    var skipped = undo ? tweaks.filter(function (i) { return !i.undo; }).concat(apps) : [];
    var useApps = !undo && apps.length > 0;
    var d = new Date(), pd = SN.pad, L = [];
    if (!gui) {
      L.push('#Requires -Version 5.1');
      L.push('<#');
      L.push('  SnowToolkit - gerado em ' + pd(d.getDate()) + '/' + pd(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pd(d.getHours()) + ':' + pd(d.getMinutes()));
      L.push('  Modo: ' + (undo ? 'DESFAZER' : 'APLICAR') + '   Itens: ' + (act.length + (useApps ? 1 : 0)));
      L.push('  Salve como .ps1 e execute com botao direito > Executar com o PowerShell.');
      L.push('#>');
      L.push('');
    }
    L.push('$Simulate = ' + (state.sim ? '$true' : '$false') + '   # $true = apenas mostra o que faria');
    L.push('');
    if (!gui) {
    if (!auto) {
      L.push('$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)');
      L.push('if (-not $admin) {');
      L.push("    if ($PSCommandPath) { Start-Process powershell.exe -Verb RunAs -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File \"' + $PSCommandPath + '\"') }");
      L.push("    else { Write-Host 'Salve como .ps1 e execute, ou abra o PowerShell como Administrador.' -ForegroundColor Yellow }");
      L.push('    exit');
      L.push('}');
      L.push('');
    }
      L.push("$LogDir = Join-Path $env:ProgramData 'SnowToolkit\\logs'");
      L.push('New-Item -ItemType Directory -Path $LogDir -Force | Out-Null');
      L.push("Start-Transcript -Path (Join-Path $LogDir ('execucao_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.log')) | Out-Null");
      L.push('');
      L.push(HEADER_FN);
      if (!undo && sel.some(function (i) { return i.cat === 'deb'; })) { L.push(''); L.push(REMOVE_APP_FN); }
      L.push('');
    }
    if (skipped.length) {
      L.push('# Sem desfazer automatico (ignorados neste modo):');
      skipped.forEach(function (i) { L.push('#   - ' + ascii(i.title)); });
      L.push('');
    }
    if (!act.length && !useApps) L.push('# Nenhum item selecionado.');
    if (state.restore && !undo && act.length) {
      L.push('# --- Ponto de restauracao ---');
      L.push("Invoke-Step 'Criando ponto de restauracao' {");
      L.push("    Enable-ComputerRestore -Drive ($env:SystemDrive + '\\')");
      L.push("    $k = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore'");
      L.push("    Set-Reg $k 'SystemRestorePointCreationFrequency' 0");
      L.push("    Checkpoint-Computer -Description 'SnowToolkit' -RestorePointType MODIFY_SETTINGS");
      L.push("    Remove-Reg $k 'SystemRestorePointCreationFrequency'");
      L.push('}');
      L.push('');
    }
    CATS.forEach(function (c) {
      if (c.id === 'apps') return;
      var list = act.filter(function (i) { return i.cat === c.id; });
      if (!list.length) return;
      L.push('# --- ' + ascii(c.name) + ' ---');
      list.forEach(function (i) {
        L.push("Invoke-Step '" + (undo ? 'Desfazendo: ' : '') + q1(i.title) + "' {");
        L.push(indent(undo ? i.undo : i.doIt));
        L.push('}');
        L.push('');
      });
    });
    if (useApps) {
      L.push('# --- Apps (winget) ---');
      L.push('$apps = @(');
      apps.forEach(function (a, idx) { L.push("    '" + a.wid + "'" + (idx < apps.length - 1 ? ',' : '') + '   # ' + ascii(a.title)); });
      L.push(')');
      L.push("Invoke-Step ('Instalando ' + $apps.Count + ' programas via winget') {");
      L.push("    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'winget nao encontrado. Instale o Instalador de Aplicativo pela Microsoft Store.' }");
      L.push('    $falhas = @()');
      L.push('    foreach ($id in $apps) {');
      L.push("        Write-Host ('   > ' + $id)");
      L.push('        winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements');
      L.push('        if ($LASTEXITCODE -ne 0) { $falhas += $id }');
      L.push('    }');
      L.push("    if ($falhas.Count) { Write-Host ('[!!] Sem sucesso (ja instalado ou ID mudou): ' + ($falhas -join ', ')) }");
      L.push('}');
      L.push('');
    }
    if (act.some(function (i) { return i.x; })) {
      L.push("Invoke-Step 'Reiniciando o Explorer para aplicar o visual' {");
      L.push('    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue');
      L.push('}');
      L.push('');
    }
    L.push('Write-Host ""');
    L.push("Write-Host '[OK] Concluido. Alguns ajustes so valem depois de reiniciar o PC.'");
    if (!gui) {
      L.push("Write-Host ('Log: ' + $LogDir) -ForegroundColor DarkGray");
      L.push('Stop-Transcript | Out-Null');
      if (!auto) L.push("Read-Host 'Pressione ENTER para sair'");
    }
    return L.join('\n');
  }
  SN.optimizeBuild = function (m) { loadState(); return build(m); };
  SN.optimizeCount = function () { loadState(); return state.sel.size; };

  /* ---------- PAGINA ---------- */
  SN.page('optimize', {
    title: 'Otimizar e Debloat', icon: 'sliders', sub: 'Privacidade, desempenho, ajustes e instalação — com perfis, simulação e desfazer',
    render: function (view) {
      loadState();
      var listBox = h('div'), tabsBox = h('div', { class: 'tabs' }), summary = h('span', { class: 'muted' }), previewBox = h('div');
      var search = h('input', { class: 'inp', type: 'search', placeholder: 'Buscar nesta aba...', oninput: function () { state.q = search.value.toLowerCase(); drawList(); } });
      var runBtn = h('button', { class: 'btn primary' }, SN.icon('play', 15), 'Executar agora');
      var fileIn = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' }, onchange: function () {
        var f = fileIn.files && fileIn.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var d = JSON.parse(rd.result); if (!d || !Array.isArray(d.sel)) throw new Error('arquivo inválido');
            var ok = d.sel.filter(function (id) { return byId[id]; });
            state.sel = new Set(ok); state.restore = d.restore !== false; state.sim = !!d.sim; state.mode = d.mode === 'undo' ? 'undo' : 'apply';
            restoreCb.checked = state.restore; simCb.checked = state.sim; persist(); drawTabs(); drawList(); drawSummary(); drawMode(); drawPreview();
            SN.toast(ok.length + ' itens importados' + (ok.length < d.sel.length ? ' (' + (d.sel.length - ok.length) + ' desconhecidos ignorados)' : ''), 'ok');
          } catch (e) { SN.toast('Não foi possível importar: ' + e.message, 'bad'); }
          fileIn.value = '';
        };
        rd.readAsText(f);
      } });
      function exportCfg() {
        var data = { app: 'SnowToolkit', version: 1, created: new Date().toISOString(), sel: Array.from(state.sel), restore: state.restore, sim: state.sim, mode: state.mode };
        SN.saveFile('SnowToolkit_selecao.json', JSON.stringify(data, null, 2));
      }

      function counts(cat) { return ITEMS.filter(function (i) { return i.cat === cat && state.sel.has(i.id); }).length; }
      function drawTabs() {
        SN.clear(tabsBox);
        CATS.forEach(function (c) {
          tabsBox.appendChild(h('button', { class: 'tab' + (state.tab === c.id ? ' on' : ''), onclick: function () { state.tab = c.id; drawTabs(); drawList(); } }, c.name + ' ', h('span', { class: 'faint' }, String(counts(c.id)))));
        });
      }
      function drawSummary() {
        var n = state.sel.size, crit = ITEMS.filter(function (i) { return state.sel.has(i.id) && i.risk === 'c'; }).length;
        summary.textContent = n + ' selecionados' + (crit ? ' · ' + crit + ' com cuidado' : '');
        runBtn.disabled = !n;
      }
      function toggle(id, on) { if (on) { state.sel.add(id); var it = byId[id]; if (it && it.radio) { var cleared = false; ITEMS.forEach(function (o) { if (o.radio === it.radio && o.id !== id && state.sel.delete(o.id)) cleared = true; }); if (cleared) drawList(); } } else state.sel.delete(id); persist(); drawTabs(); drawSummary(); if (previewOpen) drawPreview(); }
      function row(i) {
        var on = state.sel.has(i.id);
        var cb = h('input', { type: 'checkbox', checked: on });
        var li = h('div', { class: 'opt' + (on ? ' on' : '') });
        cb.addEventListener('change', function () { li.classList.toggle('on', cb.checked); toggle(i.id, cb.checked); });
        var lab = h('label', null, cb, h('span', { class: 't' }, h('b', null, i.title), h('small', null, i.desc)), i.cat === 'apps' ? null : h('span', { class: 'pill ' + i.risk }, RISK[i.risk]));
        li.appendChild(lab);
        if (i.cat !== 'apps' && i.doIt) {
          var code = h('div', { class: 'codebar' });
          var drawCode = function () {
            SN.clear(code);
            code.appendChild(h('button', { class: 'linkbtn', onclick: function () { state.open[i.id] = !state.open[i.id]; drawCode(); } }, state.open[i.id] ? 'ocultar código' : 'ver código'));
            if (state.open[i.id]) code.appendChild(h('pre', { class: 'snip' }, (state.mode === 'undo' ? i.undo : i.doIt) || '# Este item não tem desfazer automático.'));
          };
          drawCode(); li.appendChild(code);
        }
        return li;
      }
      function drawList() {
        SN.clear(listBox);
        var items = ITEMS.filter(function (i) { return i.cat === state.tab && (!state.q || (i.title + ' ' + i.desc + ' ' + (i.group || '')).toLowerCase().indexOf(state.q) >= 0); });
        if (!items.length) { listBox.appendChild(h('div', { class: 'empty' }, 'Nada encontrado nesta aba.')); return; }
        if (state.tab === 'apps') {
          listBox.appendChild(h('div', { class: 'note', style: { marginBottom: '10px' } }, 'Seleção rápida de apps para o script. O catálogo completo (cerca de 290 apps, winget e Chocolatey) está em Programas > Instalar.', ' ', h('button', { class: 'linkbtn', onclick: function () { SN.go('programs'); } }, 'abrir Programas')));
          APPGROUPS.forEach(function (g) {
            var gi = items.filter(function (i) { return i.group === g.name; });
            if (!gi.length) return;
            listBox.appendChild(h('div', { class: 'grp-h' }, h('h4', null, g.name), h('div', { class: 'row', style: { gap: '6px' } },
              h('button', { class: 'btn sm ghost', onclick: function () { gi.forEach(function (i) { state.sel.add(i.id); }); persist(); drawTabs(); drawSummary(); drawList(); } }, 'Marcar grupo'),
              h('button', { class: 'btn sm ghost', onclick: function () { gi.forEach(function (i) { state.sel.delete(i.id); }); persist(); drawTabs(); drawSummary(); drawList(); } }, 'Limpar'))));
            listBox.appendChild(h('div', { class: 'apps-grid' }, gi.map(row)));
          });
        } else {
          listBox.appendChild(h('div', { class: 'opt-list' }, items.map(row)));
        }
      }
      var previewOpen = false;
      function drawPreview() {
        SN.clear(previewBox);
        if (!previewOpen) return;
        var text = build(false);
        previewBox.appendChild(h('div', { class: 'card' }, h('div', { class: 'card-h' }, h('h3', null, 'Script gerado (.ps1 independente)'), h('span', { class: 'sp' }),
          h('button', { class: 'btn sm', onclick: function () { SN.copy(text, 'Script copiado'); } }, SN.icon('copy', 14), 'Copiar'),
          h('button', { class: 'btn sm', onclick: function () { SN.saveFile('SnowToolkit_perfil.ps1', text); } }, SN.icon('dl', 14), 'Salvar .ps1')),
          h('pre', { class: 'snip', style: { maxHeight: '340px' } }, text)));
      }

      var presetSeg = h('div', { class: 'seg' }, PRESETS.map(function (p) {
        return h('button', { title: p[2], onclick: function () { applyPreset(p[0]); persist(); drawTabs(); drawList(); drawSummary(); drawPreview(); SN.toast('Perfil aplicado: ' + p[1]); } }, p[1]);
      }));
      var modeSeg = h('div', { class: 'seg' });
      function drawMode() {
        SN.clear(modeSeg);
        [['apply', 'Aplicar'], ['undo', 'Desfazer']].forEach(function (m) {
          modeSeg.appendChild(h('button', { class: state.mode === m[0] ? 'on' : '', onclick: function () { state.mode = m[0]; persist(); drawMode(); drawList(); drawPreview(); } }, m[1]));
        });
      }
      var restoreCb = h('input', { type: 'checkbox', checked: state.restore, onchange: function () { state.restore = restoreCb.checked; persist(); drawPreview(); } });
      var simCb = h('input', { type: 'checkbox', checked: state.sim, onchange: function () { state.sim = simCb.checked; persist(); drawPreview(); } });

      runBtn.addEventListener('click', function () {
        var n = state.sel.size;
        var crit = ITEMS.filter(function (i) { return state.sel.has(i.id) && i.risk === 'c'; });
        SN.confirm({
          title: (state.mode === 'undo' ? 'Desfazer ' : 'Aplicar ') + n + ' itens', danger: crit.length > 0, ok: state.sim ? 'Simular' : 'Executar',
          body: state.sim ? 'Modo simulação: nada será alterado, só mostra o que seria feito.' : 'Os ajustes serão aplicados neste computador.' + (state.restore && state.mode === 'apply' ? ' Um ponto de restauração será criado antes.' : ''),
          warn: crit.length ? 'Itens marcados como "Cuidado": ' + crit.map(function (i) { return i.title; }).join('; ') : null
        }).then(function (yes) { if (yes) SN.runScript('Otimizar (' + n + ' itens)', build(true)); });
      });

      view.append(
        h('div', { class: 'row', style: { marginBottom: '14px', justifyContent: 'space-between' } },
          h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Perfis:'), presetSeg), h('div', { class: 'row' }, search,
            h('button', { class: 'btn', title: 'Salvar a seleção atual em um arquivo .json', onclick: exportCfg }, SN.icon('dl', 15), 'Exportar'),
            h('button', { class: 'btn', title: 'Carregar uma seleção salva', onclick: function () { fileIn.click(); } }, SN.icon('plus', 15), 'Importar'), fileIn)),
        tabsBox, listBox,
        h('div', { class: 'actbar' },
          summary, h('span', { class: 'sp' }),
          modeSeg,
          h('label', { class: 'chk' }, restoreCb, 'Ponto de restauração'),
          h('label', { class: 'chk' }, simCb, 'Só simular'),
          h('button', { class: 'btn', onclick: function () { previewOpen = !previewOpen; drawPreview(); if (previewOpen) previewBox.scrollIntoView({ behavior: 'smooth' }); } }, SN.icon('file', 15), 'Ver / exportar script'),
          runBtn),
        previewBox);
      drawTabs(); drawList(); drawSummary(); drawMode();
    }
  });
