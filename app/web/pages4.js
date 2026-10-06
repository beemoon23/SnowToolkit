'use strict';
/* Gerador de Autounattend.xml (instalação automatizada do Windows 10/11) */
(function () {
  var SN = window.SN, h = SN.h;

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  // senha no formato do unattend: base64(UTF-16LE(senha + "Password"))
  function pwdB64(pw, suffix) {
    var s = pw + suffix, bytes = [];
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); bytes.push(c & 255, c >> 8); }
    var bin = ''; bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function utf8b64(str) { return btoa(unescape(encodeURIComponent(str))); }

  var LOCALES = [
    ['pt-BR', 'Português (Brasil)', '0416:00010416'], ['pt-PT', 'Português (Portugal)', '0816:00010816'], ['en-US', 'English (US)', '0409:00000409'], ['es-ES', 'Español (España)', '040a:0000040a'],
    ['es-MX', 'Español (México)', '080a:0000080a']
  ];
  var TZ = [['E. South America Standard Time', 'Brasília (UTC-3)'], ['Central Brazilian Standard Time', 'Cuiabá/Campo Grande (UTC-4)'], ['SA Pacific Standard Time', 'Bogotá/Lima (UTC-5)'], ['Pacific Standard Time', 'Pacífico (EUA)'], ['Eastern Standard Time', 'Leste (EUA)'], ['GMT Standard Time', 'Londres'], ['W. Europe Standard Time', 'Europa Central']];

  function arch() { return 'processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"'; }
  function runCmd(order, path, indent) { return indent + '<RunSynchronousCommand wcm:action="add"><Order>' + order + '</Order><Path>' + esc(path) + '</Path></RunSynchronousCommand>\n'; }

  function generate(o) {
    var L = o.locale, X = [];
    X.push('<?xml version="1.0" encoding="utf-8"?>');
    X.push('<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">');
    X.push('  <!-- Gerado pelo SnowToolkit em ' + new Date().toLocaleString('pt-BR') + ' -->');

    // ---- windowsPE
    X.push('  <settings pass="windowsPE">');
    X.push('    <component name="Microsoft-Windows-International-Core-WinPE" ' + arch() + '>');
    X.push('      <SetupUILanguage><UILanguage>' + L[0] + '</UILanguage></SetupUILanguage>');
    X.push('      <InputLocale>' + L[2] + '</InputLocale><SystemLocale>' + L[0] + '</SystemLocale><UILanguage>' + L[0] + '</UILanguage><UserLocale>' + L[0] + '</UserLocale>');
    X.push('    </component>');
    X.push('    <component name="Microsoft-Windows-Setup" ' + arch() + '>');
    if (o.wipe) {
      X.push('      <DiskConfiguration>');
      X.push('        <Disk wcm:action="add"><DiskID>0</DiskID><WillWipeDisk>true</WillWipeDisk>');
      X.push('          <CreatePartitions>');
      X.push('            <CreatePartition wcm:action="add"><Order>1</Order><Type>EFI</Type><Size>300</Size></CreatePartition>');
      X.push('            <CreatePartition wcm:action="add"><Order>2</Order><Type>MSR</Type><Size>16</Size></CreatePartition>');
      X.push('            <CreatePartition wcm:action="add"><Order>3</Order><Type>Primary</Type><Extend>true</Extend></CreatePartition>');
      X.push('          </CreatePartitions>');
      X.push('          <ModifyPartitions>');
      X.push('            <ModifyPartition wcm:action="add"><Order>1</Order><PartitionID>1</PartitionID><Label>System</Label><Format>FAT32</Format></ModifyPartition>');
      X.push('            <ModifyPartition wcm:action="add"><Order>2</Order><PartitionID>2</PartitionID></ModifyPartition>');
      X.push('            <ModifyPartition wcm:action="add"><Order>3</Order><PartitionID>3</PartitionID><Label>Windows</Label><Letter>C</Letter><Format>NTFS</Format></ModifyPartition>');
      X.push('          </ModifyPartitions>');
      X.push('        </Disk>');
      X.push('      </DiskConfiguration>');
      X.push('      <ImageInstall><OSImage><InstallTo><DiskID>0</DiskID><PartitionID>3</PartitionID></InstallTo></OSImage></ImageInstall>');
    }
    X.push('      <UserData>' + (o.key ? '<ProductKey><Key>' + esc(o.key) + '</Key></ProductKey>' : '') + '<AcceptEula>true</AcceptEula></UserData>');
    if (o.bypassHw) {
      X.push('      <RunSynchronous>');
      var ord = 1;
      ['BypassTPMCheck', 'BypassSecureBootCheck', 'BypassRAMCheck', 'BypassCPUCheck', 'BypassStorageCheck'].forEach(function (k) {
        X.push(runCmd(ord++, 'reg.exe add "HKLM\\SYSTEM\\Setup\\LabConfig" /v ' + k + ' /t REG_DWORD /d 1 /f', '        ').replace(/\n$/, ''));
      });
      X.push('      </RunSynchronous>');
    }
    X.push('    </component>');
    X.push('  </settings>');

    // ---- specialize
    X.push('  <settings pass="specialize">');
    X.push('    <component name="Microsoft-Windows-Shell-Setup" ' + arch() + '>');
    if (o.computer) X.push('      <ComputerName>' + esc(o.computer) + '</ComputerName>');
    X.push('      <TimeZone>' + esc(o.tz) + '</TimeZone>');
    if (o.owner) X.push('      <RegisteredOwner>' + esc(o.owner) + '</RegisteredOwner>');
    if (o.org) X.push('      <RegisteredOrganization>' + esc(o.org) + '</RegisteredOrganization>');
    X.push('    </component>');
    if (o.localOnly) {
      X.push('    <component name="Microsoft-Windows-Deployment" ' + arch() + '>');
      X.push('      <RunSynchronous>');
      X.push(runCmd(1, 'reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OOBE" /v BypassNRO /t REG_DWORD /d 1 /f', '        ').replace(/\n$/, ''));
      X.push('      </RunSynchronous>');
      X.push('    </component>');
    }
    X.push('  </settings>');

    // ---- oobeSystem
    X.push('  <settings pass="oobeSystem">');
    X.push('    <component name="Microsoft-Windows-International-Core" ' + arch() + '>');
    X.push('      <InputLocale>' + L[2] + '</InputLocale><SystemLocale>' + L[0] + '</SystemLocale><UILanguage>' + L[0] + '</UILanguage><UserLocale>' + L[0] + '</UserLocale>');
    X.push('    </component>');
    X.push('    <component name="Microsoft-Windows-Shell-Setup" ' + arch() + '>');
    X.push('      <OOBE>');
    X.push('        <HideEULAPage>true</HideEULAPage><HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>');
    X.push('        <HideOnlineAccountScreens>' + (o.localOnly ? 'true' : 'false') + '</HideOnlineAccountScreens><HideWirelessSetupInOOBE>' + (o.skipWifi ? 'true' : 'false') + '</HideWirelessSetupInOOBE>');
    X.push('        <ProtectYourPC>' + o.protect + '</ProtectYourPC><SkipMachineOOBE>true</SkipMachineOOBE><SkipUserOOBE>true</SkipUserOOBE>');
    X.push('      </OOBE>');
    if (o.user) {
      X.push('      <UserAccounts><LocalAccounts><LocalAccount wcm:action="add">');
      X.push('        <Name>' + esc(o.user) + '</Name><DisplayName>' + esc(o.display || o.user) + '</DisplayName><Group>' + (o.admin ? 'Administrators' : 'Users') + '</Group>');
      X.push('        <Password><Value>' + (o.pass ? pwdB64(o.pass, 'Password') : '') + '</Value><PlainText>' + (o.pass ? 'false' : 'true') + '</PlainText></Password>');
      X.push('      </LocalAccount></LocalAccounts></UserAccounts>');
      if (o.autologon) {
        X.push('      <AutoLogon><Enabled>true</Enabled><LogonCount>1</LogonCount><Username>' + esc(o.user) + '</Username>');
        X.push('        <Password><Value>' + (o.pass ? pwdB64(o.pass, 'Password') : '') + '</Value><PlainText>' + (o.pass ? 'false' : 'true') + '</PlainText></Password></AutoLogon>');
      }
    }
    // ---- comandos no primeiro login
    var cmds = [];
    if (o.script) {
      var b64 = utf8b64(o.script), chunk = 5000, n = 0;
      cmds.push(['Preparar pasta', 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "New-Item -ItemType Directory -Path C:\\Windows\\Setup\\Scripts -Force | Out-Null; Set-Content -Path C:\\Windows\\Setup\\Scripts\\snow.b64 -Value \'\' -NoNewline"']);
      for (var i = 0; i < b64.length; i += chunk) {
        cmds.push(['Gravar parte ' + (++n), 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-Content -Path C:\\Windows\\Setup\\Scripts\\snow.b64 -Value \'' + b64.slice(i, i + chunk) + '\' -NoNewline"']);
      }
      cmds.push(['Montar o script', 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$b=(Get-Content C:\\Windows\\Setup\\Scripts\\snow.b64 -Raw); [IO.File]::WriteAllText(\'C:\\Windows\\Setup\\Scripts\\SnowToolkit.ps1\', [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b)), (New-Object Text.UTF8Encoding $true))"']);
      cmds.push(['Executar o perfil SnowToolkit', 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\Windows\\Setup\\Scripts\\SnowToolkit.ps1']);
    }
    (o.extra || '').split('\n').forEach(function (ln) { ln = ln.trim(); if (ln) cmds.push(['Comando personalizado', ln]); });
    if (cmds.length) {
      X.push('      <FirstLogonCommands>');
      cmds.forEach(function (c, ix) { X.push('        <SynchronousCommand wcm:action="add"><Order>' + (ix + 1) + '</Order><Description>' + esc(c[0]) + '</Description><CommandLine>' + esc(c[1]) + '</CommandLine></SynchronousCommand>'); });
      X.push('      </FirstLogonCommands>');
    }
    X.push('    </component>');
    X.push('  </settings>');
    X.push('</unattend>');
    return X.join('\n');
  }
  SN.generateUnattend = generate;

  SN.page('unattend', {
    title: 'Autounattend.xml', sub: 'Instalação do Windows sem perguntas: idioma, usuário, privacidade e o seu perfil de ajustes', icon: 'zap',
    render: function (view) {
      var saved = SN.store.get('unattend', {});
      var F = {};
      function field(id, label, el, hint) { F[id] = el; return h('label', { class: 'fld' }, h('span', null, label), el, hint ? h('small', { class: 'faint' }, hint) : null); }
      function inp(id, label, val, ph, type, hint) { return field(id, label, h('input', { class: 'inp', type: type || 'text', value: saved[id] != null ? saved[id] : val, placeholder: ph || '', autocomplete: 'off' }), hint); }
      function sel(id, label, opts, val) { var s = h('select', { class: 'inp' }, opts.map(function (o) { return h('option', { value: o[0] }, o[1]); })); s.value = saved[id] != null ? saved[id] : val; return field(id, label, s); }
      function chk(id, label, val, hint) { var c = h('input', { type: 'checkbox', checked: saved[id] != null ? saved[id] : val }); F[id] = c; return h('label', { class: 'chk', style: { alignItems: 'flex-start' } }, c, h('span', null, label, hint ? h('div', { class: 'faint', style: { fontSize: '12px' } }, hint) : null)); }
      var out = h('div');

      function collect() {
        var loc = LOCALES.filter(function (l) { return l[0] === F.locale.value; })[0] || LOCALES[0];
        var o = { locale: loc, tz: F.tz.value, computer: F.computer.value.trim(), owner: F.owner.value.trim(), org: F.org.value.trim(), key: F.key.value.trim(), user: F.user.value.trim(), display: F.display.value.trim(),
          pass: F.pass.value, admin: F.admin.checked, autologon: F.autologon.checked, localOnly: F.localOnly.checked, skipWifi: F.skipWifi.checked, bypassHw: F.bypassHw.checked, wipe: F.wipe.checked, protect: F.protect.value, useProfile: F.useProfile.checked, extra: F.extra.value };
        return o;
      }
      function persist(o) { var s = {}; ['locale', 'tz', 'computer', 'owner', 'org', 'key', 'user', 'display', 'protect', 'extra'].forEach(function (k) { s[k] = F[k].value; }); ['admin', 'autologon', 'localOnly', 'skipWifi', 'bypassHw', 'wipe', 'useProfile'].forEach(function (k) { s[k] = F[k].checked; }); SN.store.set('unattend', s); }
      function build() {
        var o = collect();
        if (o.computer && !/^[A-Za-z0-9\-]{1,15}$/.test(o.computer)) return SN.toast('Nome do computador: até 15 letras, números ou hífen', 'bad');
        if (o.user && !/^[^"\/\\\[\]:;|=,+*?<>@]{1,20}$/.test(o.user)) return SN.toast('Nome de usuário inválido', 'bad');
        if (o.wipe && !o.user) { /* permitido */ }
        o.script = o.useProfile ? SN.optimizeBuild('auto') : '';
        persist(o);
        var xml = generate(o), nSel = o.useProfile ? 'com o perfil de Otimizar atual' : 'sem perfil de ajustes';
        SN.clear(out).append(
          SN.card('autounattend.xml gerado (' + Math.round(xml.length / 1024) + ' KB, ' + nSel + ')', h('div', { class: 'stack' },
            o.wipe ? h('div', { class: 'note warn' }, 'ATENÇÃO: este arquivo APAGA o disco 0 por completo (layout UEFI/GPT) assim que o instalador iniciar. Use somente em máquinas que serão formatadas.') : null,
            o.pass ? h('div', { class: 'note warn' }, 'A senha fica no arquivo apenas ofuscada (base64), não criptografada. Apague o arquivo do pendrive depois de usar.') : null,
            h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: function () { SN.saveFile('autounattend.xml', xml); } }, SN.icon('dl', 15), 'Salvar na Área de Trabalho'), h('button', { class: 'btn', onclick: function () { SN.copy(xml, 'XML copiado'); } }, SN.icon('copy', 15), 'Copiar')),
            h('pre', { class: 'snip', style: { maxHeight: '360px' } }, xml.length > 14000 ? xml.slice(0, 6000) + '\n\n  ... (' + Math.round(xml.length / 1024) + ' KB no total; o arquivo salvo contém tudo) ...' : xml))));
        out.scrollIntoView({ behavior: 'smooth' });
      }

      view.append(
        h('div', { class: 'note', style: { marginBottom: '14px' } }, 'Gera um arquivo autounattend.xml. Copie-o para a RAIZ do pendrive de instalação do Windows (o mesmo nível de setup.exe); o instalador o lê sozinho. Teste primeiro numa máquina virtual.'),
        h('div', { class: 'g2' },
          SN.card('Idioma e região', h('div', { class: 'stack' },
            sel('locale', 'Idioma e teclado', LOCALES.map(function (l) { return [l[0], l[1]]; }), 'pt-BR'), sel('tz', 'Fuso horário', TZ, 'E. South America Standard Time'),
            inp('key', 'Chave de produto (opcional)', '', 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX', 'text', 'Em branco: o instalador pergunta a edição.'))),
          SN.card('Computador', h('div', { class: 'stack' },
            inp('computer', 'Nome do computador', '', 'ex.: PC-REC-01', 'text', 'Em branco: o Windows escolhe um nome aleatório.'), inp('owner', 'Proprietário registrado', '', ''), inp('org', 'Organização', '', ''))),
          SN.card('Usuário', h('div', { class: 'stack' },
            inp('user', 'Nome de usuário (conta local)', '', 'ex.: suporte', 'text', 'Em branco: o Windows pede para criar a conta na primeira inicialização.'), inp('display', 'Nome exibido', '', ''), inp('pass', 'Senha', '', '', 'password', 'Pode ficar em branco.'),
            chk('admin', 'Conta de administrador', true), chk('autologon', 'Entrar automaticamente uma vez (necessário para rodar o perfil de ajustes)', true))),
          SN.card('Instalação', h('div', { class: 'stack' },
            chk('localOnly', 'Pular a conta Microsoft (usar conta local)', true), chk('skipWifi', 'Pular a tela de Wi-Fi', false), chk('bypassHw', 'Ignorar requisitos do Windows 11 (TPM, Secure Boot, RAM, CPU, disco)', false, 'Para hardware antigo. O Windows pode ficar sem suporte oficial.'),
            sel('protect', 'Tela "Proteja seu PC"', [['3', 'Pular (sem mudanças)'], ['1', 'Configurações recomendadas'], ['2', 'Instalar só atualizações']], '3'),
            chk('wipe', 'APAGAR o disco 0 e particionar automaticamente (UEFI/GPT)', false, 'PERIGOSO: destrói todos os dados do disco 0 sem perguntar.'))),
          SN.card('Depois da instalação', h('div', { class: 'stack' },
            chk('useProfile', 'Executar o perfil da página Otimizar (' + SN.optimizeCount() + ' itens marcados serão embutidos)', true, 'Roda no primeiro login como o usuário criado.'),
            field('extra', 'Comandos extras no primeiro login (um por linha)', h('textarea', { class: 'inp', rows: 4, placeholder: 'winget install --id Google.Chrome -e --silent --accept-package-agreements' }, saved.extra || ''))))),
        h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn primary', onclick: build }, SN.icon('zap', 15), 'Gerar autounattend.xml')), out);
    }
  });
})();
