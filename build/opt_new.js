
  /* ===================== NOVOS AJUSTES (SnowToolkit 2.1) =====================
     p: r=Recomendado s=Estrito e=Extremo g=Gamer t=Técnico m=Mínimo
     (Estrito inclui o Recomendado; Extremo inclui os dois.)  */

  /* ---------- TELEMETRIA ---------- */
  T('t_upd', 'tel', 'Telemetria do Windows Update e do OneSettings',
    'Impede o download de configurações de telemetria da nuvem e as notificações de feedback.', 's', 'rgtm',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection'
Set-Reg $k 'DisableOneSettingsDownloads' 1
Set-Reg $k 'DoNotShowFeedbackNotifications' 1`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection'
Remove-Reg $k 'DisableOneSettingsDownloads'
Remove-Reg $k 'DoNotShowFeedbackNotifications'`);
  T('t_search', 'tel', 'Telemetria e web da Pesquisa do Windows',
    'Desliga a busca na web, o uso de localização e a Cortana dentro da pesquisa.', 's', 'rgt',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search'
Set-Reg $k 'AllowCortana' 0
Set-Reg $k 'AllowSearchToUseLocation' 0
Set-Reg $k 'ConnectedSearchUseWeb' 0
Set-Reg $k 'DisableWebSearch' 1`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search'
foreach ($n in 'AllowCortana','AllowSearchToUseLocation','ConnectedSearchUseWeb','DisableWebSearch') { Remove-Reg $k $n }`);
  T('t_office', 'tel', 'Telemetria do Office',
    'Desativa o envio de dados de uso do Microsoft Office 2016/2019/365.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Policies\Microsoft\Office\16.0\Common' 'QMEnable' 0
Set-Reg 'HKCU:\Software\Policies\Microsoft\Office\16.0\Common\ClientTelemetry' 'DisableTelemetry' 1
Set-Reg 'HKCU:\Software\Microsoft\Office\Common\ClientTelemetry' 'SendTelemetry' 3`,
    R`Remove-Reg 'HKCU:\Software\Policies\Microsoft\Office\16.0\Common' 'QMEnable'
Remove-Reg 'HKCU:\Software\Policies\Microsoft\Office\16.0\Common\ClientTelemetry' 'DisableTelemetry'
Remove-Reg 'HKCU:\Software\Microsoft\Office\Common\ClientTelemetry' 'SendTelemetry'`);
  T('t_appexp', 'tel', 'Coleta de dados de compatibilidade de aplicativos',
    'Desliga o inventário de programas e o assistente de compatibilidade (PCA).', 's', 'rgt',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat'
Set-Reg $k 'DisableInventory' 1
Set-Reg $k 'DisablePCA' 1
Set-Reg $k 'AITEnable' 0`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat'
foreach ($n in 'DisableInventory','DisablePCA','AITEnable') { Remove-Reg $k $n }`);
  T('t_feedback', 'tel', 'Pedidos de feedback do Windows',
    'Para de perguntar "o que você achou do Windows?" e de coletar essas respostas.', 's', 'rgtm',
    R`Set-Reg 'HKCU:\Software\Microsoft\Siuf\Rules' 'NumberOfSIUFInPeriod' 0
Set-Reg 'HKCU:\Software\Microsoft\Siuf\Rules' 'PeriodInNanoSeconds' 0`,
    R`Remove-Reg 'HKCU:\Software\Microsoft\Siuf\Rules' 'NumberOfSIUFInPeriod'
Remove-Reg 'HKCU:\Software\Microsoft\Siuf\Rules' 'PeriodInNanoSeconds'`);
  T('t_ink', 'tel', 'Coleta de escrita à mão e digitação',
    'Impede o Windows de aprender com o que você digita e escreve para personalizar sugestões.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization' 'RestrictImplicitInkCollection' 1
Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization' 'RestrictImplicitTextCollection' 1
Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization\TrainedDataStore' 'HarvestContacts' 0
Set-Reg 'HKCU:\Software\Microsoft\Personalization\Settings' 'AcceptedPrivacyPolicy' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization' 'RestrictImplicitInkCollection' 0
Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization' 'RestrictImplicitTextCollection' 0
Set-Reg 'HKCU:\Software\Microsoft\InputPersonalization\TrainedDataStore' 'HarvestContacts' 1`);
  T('t_drm', 'tel', 'Acesso à internet do DRM do Windows',
    'Impede que o Windows Media DRM consulte servidores da Microsoft.', 's', 's',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\WMDRM' 'DisableOnline' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\WMDRM' 'DisableOnline'`);
  T('t_speech', 'tel', 'Reconhecimento de voz online',
    'Desliga o reconhecimento de fala na nuvem e a personalização de entrada.', 's', 's',
    R`Set-Reg 'HKCU:\Software\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy' 'HasAccepted' 0
Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\InputPersonalization' 'AllowInputPersonalization' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy' 'HasAccepted' 1
Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\InputPersonalization' 'AllowInputPersonalization'`);
  T('t_ads', 'tel', 'Anúncios direcionados (política de sistema)',
    'Aplica a política que desativa o ID de publicidade para todos os usuários.', 's', 'rgtm',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo' 'DisabledByGroupPolicy' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo' 'DisabledByGroupPolicy'`);
  T('t_ceip', 'tel', 'Programa de Experiência do Cliente (CEIP)',
    'Desativa o envio de dados de uso do Windows para melhoria de produto.', 's', 'rgt',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows' 'CEIPEnable' 0`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\SQMClient\Windows' 'CEIPEnable'`);
  T('t_ps', 'tel', 'Telemetria do PowerShell 7 e do .NET CLI',
    'Define as variáveis de ambiente de opt-out do PowerShell e das ferramentas .NET.', 's', 'rgt',
    R`[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')
[Environment]::SetEnvironmentVariable('DOTNET_CLI_TELEMETRY_OPTOUT', '1', 'Machine')`,
    R`[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', $null, 'Machine')
[Environment]::SetEnvironmentVariable('DOTNET_CLI_TELEMETRY_OPTOUT', $null, 'Machine')`);
  T('t_wmp', 'tel', 'Telemetria do Windows Media Player',
    'Desliga o rastreamento de uso e o envio do identificador do player.', 's', 's',
    R`Set-Reg 'HKCU:\Software\Microsoft\MediaPlayer\Preferences' 'UsageTracking' 0
Set-Reg 'HKCU:\Software\Microsoft\MediaPlayer\Preferences' 'SendUserGUID' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\MediaPlayer\Preferences' 'UsageTracking' 1
Set-Reg 'HKCU:\Software\Microsoft\MediaPlayer\Preferences' 'SendUserGUID' 1`);
  T('t_vscode', 'tel', 'Telemetria do VS Code',
    'Grava telemetry.telemetryLevel = off no settings.json do usuário atual. Se o arquivo tiver comentários, o passo avisa e não altera.', 's', 'rgt',
    R`$p = Join-Path $env:APPDATA 'Code\User\settings.json'
New-Item -ItemType Directory -Path (Split-Path $p) -Force | Out-Null
try {
    $o = if (Test-Path $p) { Get-Content $p -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
    if (-not $o) { $o = [pscustomobject]@{} }
    $o | Add-Member -NotePropertyName 'telemetry.telemetryLevel' -NotePropertyValue 'off' -Force
    $o | ConvertTo-Json -Depth 10 | Set-Content $p -Encoding UTF8
} catch { Write-Host '[!!] settings.json tem comentarios ou formato especial: ajuste manualmente telemetry.telemetryLevel = off' }`, null);
  T('t_ccleaner', 'tel', 'Monitoramento e telemetria do CCleaner',
    'Desliga o monitoramento ativo e o envio de dados de uso, se o CCleaner estiver instalado.', 's', 's',
    R`$k = 'HKCU:\Software\Piriform\CCleaner'
foreach ($n in 'Monitoring','HelpImproveCCleaner','SystemMonitoring','UpdateAuto','UpdateCheck') { Set-Reg $k $n 0 }`, null);
  T('t_google', 'tel', 'Atualizações em segundo plano do Google',
    'Desativa os serviços e tarefas do Google Update (Chrome continua atualizando ao abrir).', 's', 's',
    R`foreach ($s in 'gupdate','gupdatem') { Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue; Stop-Service $s -Force -ErrorAction SilentlyContinue }
Get-ScheduledTask -TaskName 'GoogleUpdateTask*' -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null`,
    R`Set-Service 'gupdate' -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service 'gupdatem' -StartupType Manual -ErrorAction SilentlyContinue
Get-ScheduledTask -TaskName 'GoogleUpdateTask*' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null`);
  T('t_adobe', 'tel', 'Serviços e tarefas de atualização da Adobe',
    'Desativa o Adobe ARM, o Genuine Monitor e a tarefa de atualização do Acrobat.', 's', 's',
    R`foreach ($s in 'AdobeARMservice','AGSService','AGMService') { Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue; Stop-Service $s -Force -ErrorAction SilentlyContinue }
Get-ScheduledTask -TaskName 'Adobe*Update*' -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null`,
    R`foreach ($s in 'AdobeARMservice','AGSService','AGMService') { Set-Service $s -StartupType Automatic -ErrorAction SilentlyContinue }
Get-ScheduledTask -TaskName 'Adobe*Update*' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null`);
  T('t_nvidia', 'tel', 'Telemetria da Nvidia',
    'Para o container de telemetria e desativa as tarefas NvTm* do driver.', 's', 's',
    R`Set-Service 'NvTelemetryContainer' -StartupType Disabled -ErrorAction SilentlyContinue
Stop-Service 'NvTelemetryContainer' -Force -ErrorAction SilentlyContinue
Get-ScheduledTask -TaskName 'NvTm*' -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null`,
    R`Set-Service 'NvTelemetryContainer' -StartupType Automatic -ErrorAction SilentlyContinue
Get-ScheduledTask -TaskName 'NvTm*' -ErrorAction SilentlyContinue | Enable-ScheduledTask | Out-Null`);

  /* ---------- WINDOWS UPDATE ---------- */
  T('u_default', 'upd', 'Atualizações: padrão do Windows',
    'Remove as políticas de adiamento e bloqueio e religa os serviços de atualização.', 's', '',
    R`Remove-Item 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Recurse -Force -ErrorAction SilentlyContinue
Set-Service 'wuauserv' -StartupType Manual -ErrorAction SilentlyContinue
Set-Service 'UsoSvc' -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service 'wuauserv' -ErrorAction SilentlyContinue`, null);
  T('u_security', 'upd', 'Atualizações: só as de segurança',
    'Adia atualizações de recursos por 1 ano e mantém as correções de qualidade/segurança.', 'm', 'e',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
Set-Reg $k 'DeferFeatureUpdates' 1
Set-Reg $k 'DeferFeatureUpdatesPeriodInDays' 365
Set-Reg $k 'DeferQualityUpdates' 0`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
foreach ($n in 'DeferFeatureUpdates','DeferFeatureUpdatesPeriodInDays','DeferQualityUpdates') { Remove-Reg $k $n }`);
  T('u_disable', 'upd', 'Atualizações: desativar completamente',
    'Bloqueia o Windows Update. O PC deixa de receber correções de segurança. Só para máquinas isoladas ou controladas.', 'c', '',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate' 1
foreach ($s in 'wuauserv','UsoSvc') { Stop-Service $s -Force -ErrorAction SilentlyContinue; Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue }
try { Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc' 'Start' 4 } catch { Write-Host '[!!] WaaSMedicSvc e protegido nesta versao; o Windows pode religar o servico' }`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoUpdate'
Set-Service 'wuauserv' -StartupType Manual -ErrorAction SilentlyContinue
Set-Service 'UsoSvc' -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service 'wuauserv' -ErrorAction SilentlyContinue`);
  T('u_pause', 'upd', 'Estender o limite de pausa das atualizações (20 anos)',
    'Permite pausar o Windows Update por muito mais tempo que as 5 semanas padrão.', 's', 'e',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'FlightSettingsMaxPauseDays' 7300`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'FlightSettingsMaxPauseDays'`);
  T('u_metered', 'upd', 'Não baixar atualizações em conexão limitada',
    'Evita gastar o plano de dados do celular ou de roteadores 4G.', 's', 's',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'AllowAutoWindowsUpdateDownloadOverMeteredNetwork' 0`,
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' 'AllowAutoWindowsUpdateDownloadOverMeteredNetwork' 1`);
  T('u_drivers', 'upd', 'Não instalar drivers pelo Windows Update',
    'O Windows para de trocar drivers sozinho. Você instala os do fabricante manualmente.', 'm', 'e',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' 'ExcludeWUDriversInQualityUpdate' 1
Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata' 'PreventDeviceMetadataFromNetwork' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' 'ExcludeWUDriversInQualityUpdate'
Remove-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Device Metadata' 'PreventDeviceMetadataFromNetwork'`);
  T('u_noreboot', 'upd', 'Não reiniciar sozinho com usuário logado',
    'O Windows deixa de reiniciar o PC no meio do trabalho para concluir atualizações.', 's', 'rgt',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoRebootWithLoggedOnUsers' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' 'NoAutoRebootWithLoggedOnUsers'`);
  T('u_store', 'upd', 'Desativar atualização automática de apps da Store',
    'Os apps da Microsoft Store só atualizam quando você mandar.', 's', 's',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' 'AutoDownload' 2`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\WindowsStore' 'AutoDownload'`);

  /* ---------- PRIVACIDADE: permissões de apps ---------- */
  function appAccess(id, title, key, p, risk) {
    var base = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\" + key;
    T(id, 'priv', 'Bloquear acesso dos apps: ' + title, 'Define a permissão "' + key + '" como Negar para todos os apps. Você pode liberar app por app depois, nas Configurações.', risk || 'm', p,
      "Set-Reg '" + base + "' 'Value' 'Deny' 'String'", "Set-Reg '" + base + "' 'Value' 'Allow' 'String'");
  }
  appAccess('aa_loc', 'localização', 'location', 'e');
  appAccess('aa_cam', 'câmera', 'webcam', 'e', 'c');
  appAccess('aa_mic', 'microfone', 'microphone', 'e', 'c');
  appAccess('aa_fs', 'sistema de arquivos', 'broadFileSystemAccess', 'e');
  appAccess('aa_acc', 'informações da conta', 'userAccountInformation', 's');
  appAccess('aa_con', 'contatos', 'contacts', 's');
  appAccess('aa_call', 'histórico de chamadas', 'phoneCallHistory', 's');
  appAccess('aa_msg', 'mensagens', 'chat', 's');
  appAccess('aa_not', 'notificações', 'userNotificationListener', 's');
  appAccess('aa_mail', 'e-mail', 'email', 's');
  appAccess('aa_task', 'tarefas', 'userDataTasks', 's');
  appAccess('aa_diag', 'dados de diagnóstico de outros apps', 'appDiagnostics', 's');
  appAccess('aa_cal', 'calendário', 'appointments', 's');
  appAccess('aa_phone', 'chamadas telefônicas', 'phoneCall', 's');
  appAccess('aa_radio', 'rádios (Bluetooth e Wi-Fi)', 'radios', 'e');
  appAccess('aa_motion', 'movimento e atividade', 'activity', 's');
  appAccess('aa_border', 'captura de tela sem borda', 'graphicsCaptureWithoutBorder', 's');
  appAccess('aa_rec', 'captura programática de tela', 'graphicsCaptureProgrammatic', 's');
  T('aa_voice', 'priv', 'Bloquear ativação por voz dos apps',
    'Impede que apps escutem uma palavra-chave para ativar por voz.', 's', 's',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsActivateWithVoice' 2`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsActivateWithVoice'`);

  T('p_wpbt', 'priv', 'Desativar a Windows Platform Binary Table (WPBT)',
    'Impede que o fabricante da placa-mãe instale e execute programas no boot sem o seu consentimento.', 's', 'se',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' 'DisableWpbtExecution' 1`,
    R`Remove-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' 'DisableWpbtExecution'`);
  T('p_bitlocker', 'priv', 'Impedir a criptografia automática de dispositivo (BitLocker)',
    'Evita que o Windows 11 criptografe o disco sozinho ao entrar com conta Microsoft. Guarde a chave se já estiver criptografado.', 'm', 'e',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\BitLocker' 'PreventDeviceEncryption' 1`,
    R`Remove-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\BitLocker' 'PreventDeviceEncryption'`);
  T('p_sync', 'priv', 'Desativar a sincronização de configurações na nuvem',
    'Impede o envio de temas, senhas de Wi-Fi e preferências para a conta Microsoft.', 's', 'se',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync'
Set-Reg $k 'DisableSettingSync' 2
Set-Reg $k 'DisableSettingSyncUserOverride' 1`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync'
Remove-Reg $k 'DisableSettingSync'
Remove-Reg $k 'DisableSettingSyncUserOverride'`);
  T('p_clip', 'priv', 'Desativar histórico e sincronização da área de transferência',
    'Desliga o Win+V com histórico e o envio da área de transferência para outros dispositivos.', 'm', 'e',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System'
Set-Reg $k 'AllowClipboardHistory' 0
Set-Reg $k 'AllowCrossDeviceClipboard' 0`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System'
Remove-Reg $k 'AllowClipboardHistory'
Remove-Reg $k 'AllowCrossDeviceClipboard'`);
  T('p_notray', 'priv', 'Desativar a central de notificações',
    'Remove o painel de notificações da barra de tarefas.', 'm', 'e',
    R`Set-Reg 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' 'DisableNotificationCenter' 1`,
    R`Remove-Reg 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' 'DisableNotificationCenter'`, true);
  T('p_maps', 'priv', 'Desativar download automático de mapas',
    'O Windows para de baixar e atualizar mapas offline em segundo plano.', 's', 'se',
    R`Set-Reg 'HKLM:\SYSTEM\Maps' 'AutoUpdateEnabled' 0`,
    R`Set-Reg 'HKLM:\SYSTEM\Maps' 'AutoUpdateEnabled' 1`);
  T('p_lockcam', 'priv', 'Desativar a câmera na tela de bloqueio',
    'Impede o acesso à câmera antes do login.', 's', 'se',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' 'NoLockScreenCamera' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' 'NoLockScreenCamera'`);
  T('p_bio', 'priv', 'Desativar biometria',
    'Desliga leitor de digital e reconhecimento facial. O Windows Hello deixa de funcionar.', 'c', '',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Biometrics' 'Enabled' 0`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Biometrics' 'Enabled'`);
  T('p_default0', 'priv', 'Remover o usuário "default0" (criado no OOBE)',
    'Alguns Windows de fabricante criam essa conta oculta. O passo só remove se ela existir. Não tem desfazer.', 'm', 'e',
    R`if (Get-LocalUser -Name 'default0' -ErrorAction SilentlyContinue) { Remove-LocalUser -Name 'default0' } else { Write-Host '   conta default0 nao existe' }`, null);

  /* ---------- DESEMPENHO ---------- */
  T('power_bal', 'perf', 'Plano de energia Equilibrado',
    'Volta ao plano padrão da Microsoft, que equilibra consumo e desempenho.', 's', '',
    R`powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`, R`powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`);
  T('power_high', 'perf', 'Plano de energia Alto Desempenho',
    'Mantém o processador em frequência alta. Consome mais energia que o Equilibrado.', 'm', '',
    R`powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`, R`powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`);
  T('dns_goog', 'perf', 'DNS Google (8.8.8.8) nas placas ativas', 'Não use em rede com servidor DNS interno (domínio).', 'c', '',
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '8.8.8.8','8.8.4.4' }
ipconfig /flushdns | Out-Null`,
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }
ipconfig /flushdns | Out-Null`);
  T('dns_q9', 'perf', 'DNS Quad9 (9.9.9.9) nas placas ativas', 'DNS com bloqueio de domínios maliciosos. Não use em rede com DNS interno.', 'c', '',
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '9.9.9.9','149.112.112.112' }
ipconfig /flushdns | Out-Null`,
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }
ipconfig /flushdns | Out-Null`);
  T('dns_odns', 'perf', 'DNS OpenDNS (208.67.222.222) nas placas ativas', 'Não use em rede com DNS interno.', 'c', '',
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '208.67.222.222','208.67.220.220' }
ipconfig /flushdns | Out-Null`,
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }
ipconfig /flushdns | Out-Null`);
  T('dns_adg', 'perf', 'DNS AdGuard (94.140.14.14) nas placas ativas', 'DNS que bloqueia anúncios e rastreadores. Não use em rede com DNS interno.', 'c', '',
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '94.140.14.14','94.140.15.15' }
ipconfig /flushdns | Out-Null`,
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }
ipconfig /flushdns | Out-Null`);
  T('hags', 'perf', 'Desativar HAGS (agendamento de GPU por hardware)',
    'Em algumas placas melhora a estabilidade e a latência. Exige reinício.', 'm', 'g',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 1`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 2`);
  T('ipv4', 'perf', 'Preferir IPv4 sobre IPv6',
    'Pode reduzir latência em redes com IPv6 mal configurado. Não desativa o IPv6.', 's', 'e',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents' 32`,
    R`Remove-Reg 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' 'DisabledComponents'`);
  T('mousedelay', 'perf', 'Remover atraso dos menus e do hover',
    'Zera a espera de 400 ms para abrir menus e mostrar dicas ao passar o mouse.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '0' 'String'
Set-Reg 'HKCU:\Control Panel\Mouse' 'MouseHoverTime' '10' 'String'`,
    R`Set-Reg 'HKCU:\Control Panel\Desktop' 'MenuShowDelay' '400' 'String'
Set-Reg 'HKCU:\Control Panel\Mouse' 'MouseHoverTime' '400' 'String'`);
  T('defcpu', 'perf', 'Limitar o uso de CPU do Defender a 25%',
    'A verificação agendada do antivírus passa a usar no máximo 25% do processador.', 's', 'se',
    R`Set-MpPreference -ScanAvgCPULoadFactor 25`, R`Set-MpPreference -ScanAvgCPULoadFactor 50`);
  T('coreiso', 'perf', 'Desativar o Isolamento de Núcleo (integridade de memória)',
    'Pode melhorar o desempenho em jogos, mas reduz a proteção contra drivers maliciosos. Exige reinício.', 'c', '',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' 'Enabled' 0`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' 'Enabled' 1`);
  T('storsense', 'perf', 'Desativar o Sensor de Armazenamento',
    'Para a limpeza automática de temporários e da lixeira.', 's', 'e',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '01' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' '01' 1`);
  T('wsearch', 'perf', 'Desativar o serviço de Pesquisa e indexação',
    'Para o WSearch. A busca do Explorer fica mais lenta, mas libera disco e CPU em máquinas fracas.', 'm', 'e',
    R`Stop-Service 'WSearch' -Force -ErrorAction SilentlyContinue
Set-Service 'WSearch' -StartupType Disabled`,
    R`Set-Service 'WSearch' -StartupType Automatic
Start-Service 'WSearch' -ErrorAction SilentlyContinue`);
  T('faststart', 'perf', 'Desativar o Fast Startup',
    'Faz o PC desligar de verdade. Resolve problemas de boot, atualização e dual-boot.', 's', 'se',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 0`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 1`);
  T('sysresp', 'perf', 'Priorizar programas em primeiro plano (SystemResponsiveness)',
    'Reserva menos CPU para tarefas multimídia em segundo plano.', 's', 'g',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' 'SystemResponsiveness' 0`,
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' 'SystemResponsiveness' 20`);

  /* ---------- JOGOS ---------- */
  T('g_fso', 'game', 'Desativar otimizações de tela cheia',
    'Faz jogos em tela cheia rodarem em modo exclusivo, com menos latência.', 's', 'g',
    R`$k = 'HKCU:\System\GameConfigStore'
Set-Reg $k 'GameDVR_FSEBehaviorMode' 2
Set-Reg $k 'GameDVR_HonorUserFSEBehaviorMode' 1
Set-Reg $k 'GameDVR_FSEBehavior' 2
Set-Reg $k 'GameDVR_DXGIHonorFSEWindowsCompatible' 1`,
    R`$k = 'HKCU:\System\GameConfigStore'
Set-Reg $k 'GameDVR_FSEBehaviorMode' 0
Remove-Reg $k 'GameDVR_HonorUserFSEBehaviorMode'
Set-Reg $k 'GameDVR_FSEBehavior' 0
Remove-Reg $k 'GameDVR_DXGIHonorFSEWindowsCompatible'`);
  T('g_windowed', 'game', 'Desativar otimizações para jogos em janela',
    'Desliga a melhoria de apresentação (swap effect) de jogos em janela ou sem borda.', 's', 'g',
    R`Set-Reg 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' 'DirectXUserGlobalSettings' 'SwapEffectUpgradeEnable=0;' 'String'`,
    R`Set-Reg 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' 'DirectXUserGlobalSettings' 'SwapEffectUpgradeEnable=1;' 'String'`);
  T('g_mouse', 'game', 'Desativar a aceleração do mouse',
    'Movimento 1:1 do mouse ("precisão do ponteiro" desligada). Ideal para FPS.', 's', 'g',
    R`$k = 'HKCU:\Control Panel\Mouse'
Set-Reg $k 'MouseSpeed' '0' 'String'
Set-Reg $k 'MouseThreshold1' '0' 'String'
Set-Reg $k 'MouseThreshold2' '0' 'String'`,
    R`$k = 'HKCU:\Control Panel\Mouse'
Set-Reg $k 'MouseSpeed' '1' 'String'
Set-Reg $k 'MouseThreshold1' '6' 'String'
Set-Reg $k 'MouseThreshold2' '10' 'String'`);
  T('g_gamemode', 'game', 'Desativar o Modo de Jogo',
    'Em alguns jogos o Modo de Jogo causa travadas. Teste antes de manter.', 'm', '',
    R`Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 0
Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'AllowAutoGameMode' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1
Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'AllowAutoGameMode' 1`);
  T('g_bar', 'game', 'Desativar a Game Bar e o painel de inicialização',
    'Para de abrir a barra de jogos com o botão do controle e some a janela de dicas.', 's', 'g',
    R`Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'UseNexusForGameBarEnabled' 0
Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'ShowStartupPanel' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'UseNexusForGameBarEnabled' 1
Set-Reg 'HKCU:\Software\Microsoft\GameBar' 'ShowStartupPanel' 1`);
  T('g_mpo', 'game', 'Desativar Multiplane Overlay (MPO)',
    'Pode corrigir tela piscando e travamentos em algumas placas de vídeo.', 'm', '',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode' 5`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' 'OverlayTestMode'`);

  /* ---------- DEBLOAT ---------- */
  T('d_store', 'deb', 'Remover a Microsoft Store', 'Você deixa de gerenciar apps pela Store. O desfazer tenta registrar o pacote de novo.', 'c', '',
    R`Get-AppxPackage -AllUsers '*Microsoft.WindowsStore*' | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue`,
    R`Get-AppxPackage -AllUsers '*Microsoft.WindowsStore*' | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register ($_.InstallLocation + '\AppXManifest.xml') -ErrorAction SilentlyContinue }`);
  T('d_edgetune', 'deb', 'Reduzir o Edge (políticas de privacidade e propaganda)',
    'Desliga recomendações, Rewards, widgets, coleta de dados e o boost de inicialização do Edge, sem desinstalar.', 's', 'se',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge'
$v = @{ EdgeEnhanceImagesEnabled=0; PersonalizationReportingEnabled=0; ShowRecommendationsEnabled=0; HideFirstRunExperience=1; UserFeedbackAllowed=0; ConfigureDoNotTrack=1; AlternateErrorPagesEnabled=0; EdgeCollectionsEnabled=0; EdgeFollowEnabled=0; EdgeShoppingAssistantEnabled=0; MicrosoftEdgeInsiderPromotionEnabled=0; ShowMicrosoftRewards=0; WebWidgetAllowed=0; MetricsReportingEnabled=0; StartupBoostEnabled=0; PromotionalTabsEnabled=0; SendSiteInfoToImproveServices=0; DiagnosticData=0; EdgeAssetDeliveryServiceEnabled=0 }
foreach ($n in $v.Keys) { Set-Reg $k $n $v[$n] }`,
    R`Remove-Item 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Recurse -Force -ErrorAction SilentlyContinue`);
  T('d_edge', 'deb', 'Desinstalar o Microsoft Edge',
    'Usa o desinstalador do próprio Edge. Em alguns builds o Windows o reinstala. O WebView2 continua instalado (apps dependem dele). O desfazer reinstala via winget.', 'c', '',
    R`$base = Join-Path ([Environment]::GetEnvironmentVariable('ProgramFiles(x86)')) 'Microsoft\Edge\Application'
$setup = Get-ChildItem $base -Recurse -Filter setup.exe -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'Installer' } | Sort-Object FullName -Descending | Select-Object -First 1
if ($setup) {
    Set-Reg 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate' 'DoNotUpdateToEdgeWithChromium' 1
    Start-Process $setup.FullName -ArgumentList '--uninstall --system-level --force-uninstall --verbose-logging' -Wait
} else { Write-Host '   Edge nao encontrado (ja removido?)' }`,
    R`winget install --id Microsoft.Edge -e --silent --accept-package-agreements --accept-source-agreements
Remove-Reg 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate' 'DoNotUpdateToEdgeWithChromium'`);
  T('d_brave', 'deb', 'Reduzir o Brave (Rewards, carteira, IA e VPN)',
    'Aplica políticas que desligam recursos extras do Brave, se estiver instalado.', 's', 's',
    R`$k = 'HKLM:\SOFTWARE\Policies\BraveSoftware\Brave'
Set-Reg $k 'BraveRewardsDisabled' 1
Set-Reg $k 'BraveWalletDisabled' 1
Set-Reg $k 'BraveAIChatEnabled' 0
Set-Reg $k 'BraveVPNDisabled' 1`,
    R`Remove-Item 'HKLM:\SOFTWARE\Policies\BraveSoftware\Brave' -Recurse -Force -ErrorAction SilentlyContinue`);
  T('d_hyperv', 'deb', 'Desativar o Hyper-V', 'Máquinas virtuais, WSL2 e o Windows Sandbox deixam de funcionar. Exige reinício.', 'm', '',
    R`Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart | Out-Null`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All -NoRestart | Out-Null`);
  T('d_ie', 'deb', 'Desativar o Internet Explorer (recurso opcional)', 'Remove o IE11 residual do Windows.', 's', 'se',
    R`Disable-WindowsOptionalFeature -Online -FeatureName Internet-Explorer-Optional-amd64 -NoRestart -ErrorAction SilentlyContinue | Out-Null`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName Internet-Explorer-Optional-amd64 -NoRestart -ErrorAction SilentlyContinue | Out-Null`);
  T('d_fax', 'deb', 'Desativar Fax e Digitalização do Windows', 'Se você usa o app Fax e Scanner, deixe desmarcado.', 'm', 'e',
    R`Disable-WindowsOptionalFeature -Online -FeatureName FaxServicesClientPackage -NoRestart -ErrorAction SilentlyContinue | Out-Null`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName FaxServicesClientPackage -NoRestart -ErrorAction SilentlyContinue | Out-Null`);
  T('d_wmp', 'deb', 'Desativar o Windows Media Player clássico', 'O player antigo (legado). O app novo Mídia não é afetado.', 's', 'e',
    R`Disable-WindowsOptionalFeature -Online -FeatureName WindowsMediaPlayer -NoRestart -ErrorAction SilentlyContinue | Out-Null`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName WindowsMediaPlayer -NoRestart -ErrorAction SilentlyContinue | Out-Null`);
  T('d_recall', 'deb', 'Remover o recurso Recall', 'Desativa o recurso opcional Recall e a análise de dados por IA.', 's', 'rse',
    R`Disable-WindowsOptionalFeature -Online -FeatureName Recall -NoRestart -ErrorAction SilentlyContinue | Out-Null
Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' 'DisableAIDataAnalysis' 1`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName Recall -NoRestart -ErrorAction SilentlyContinue | Out-Null
Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' 'DisableAIDataAnalysis'`);
  T('d_notepadai', 'deb', 'Desativar a IA do Bloco de Notas', 'Remove os recursos de reescrita e resumo por IA.', 's', 'rse',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\WindowsNotepad' 'DisableAIFeatures' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\WindowsNotepad' 'DisableAIFeatures'`);
  T('d_paintai', 'deb', 'Desativar a IA do Paint', 'Remove Cocriador, Preenchimento Generativo e Criador de Imagens.', 's', 'se',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Paint'
Set-Reg $k 'DisableCocreator' 1
Set-Reg $k 'DisableGenerativeFill' 1
Set-Reg $k 'DisableImageCreator' 1`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Paint'
foreach ($n in 'DisableCocreator','DisableGenerativeFill','DisableImageCreator') { Remove-Reg $k $n }`);
  T('d_hidecop', 'deb', 'Esconder o botão do Copilot no Explorer e na barra', 'Só oculta o botão; para remover o app use "App do Copilot".', 's', 'rse',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'ShowCopilotButton' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'ShowCopilotButton' 1`, true);
  T('d_aipkg', 'deb', 'Remover pacotes de IA do Windows', 'Provedor do Copilot e pacotes de IA instalados como app.', 'm', 'e',
    R`Remove-App 'Microsoft.Windows.Ai.Copilot.Provider','Microsoft.Copilot','Microsoft.Windows.Copilot'`, null);
  T('d_ext', 'deb', 'Remover extensões de codec (HEVC, VP9, AV1, WebP, HEIF, RAW)',
    'Fotos HEIC e vídeos H.265/AV1 podem deixar de abrir no Windows. Reinstale pela Store se precisar.', 'm', '',
    R`Remove-App 'Microsoft.HEVCVideoExtension','Microsoft.VP9VideoExtensions','Microsoft.AV1VideoExtension','Microsoft.WebpImageExtension','Microsoft.HEIFImageExtension','Microsoft.RawImageExtension','Microsoft.WebMediaExtensions'`, null);

  /* ---------- AJUSTES / DIVERSOS ---------- */
  T('m_endtask', 'tweak', 'Botão "Finalizar tarefa" no menu da barra de tarefas',
    'Clique direito em um app na barra de tarefas e encerre o processo sem abrir o Gerenciador.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings' 'TaskbarEndTask' 1`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings' 'TaskbarEndTask' 0`);
  T('m_recent', 'tweak', 'Ocultar "adicionados recentemente" no Menu Iniciar', 'Menu mais limpo.', 's', 'se',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer' 'HideRecentlyAddedApps' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer' 'HideRecentlyAddedApps'`);
  T('m_homegal', 'tweak', 'Remover Início e Galeria do Explorador de Arquivos', 'Tira essas duas entradas do painel de navegação.', 's', 'se',
    R`foreach ($g in '{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}','{f874310e-b6b7-47dc-bc84-b9e6b38f5903}') { Set-Reg ('HKCU:\Software\Classes\CLSID\' + $g) 'System.IsPinnedToNameSpaceTree' 0 }`,
    R`foreach ($g in '{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}','{f874310e-b6b7-47dc-bc84-b9e6b38f5903}') { Set-Reg ('HKCU:\Software\Classes\CLSID\' + $g) 'System.IsPinnedToNameSpaceTree' 1 }`, true);
  T('m_utc', 'tweak', 'Relógio de hardware em UTC', 'Use se o PC tem dual-boot com Linux, para os dois sistemas concordarem na hora.', 'm', '',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation' 'RealTimeIsUniversal' 1`,
    R`Remove-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation' 'RealTimeIsUniversal'`);
  T('m_numlock', 'tweak', 'Ligar o NumLock na inicialização', 'Valor aplicado à tela de login (perfil padrão).', 's', 'rt',
    R`Set-Reg 'Registry::HKEY_USERS\.DEFAULT\Control Panel\Keyboard' 'InitialKeyboardIndicators' '2' 'String'`,
    R`Set-Reg 'Registry::HKEY_USERS\.DEFAULT\Control Panel\Keyboard' 'InitialKeyboardIndicators' '0' 'String'`);
  T('m_snap', 'tweak', 'Desativar a barra de layouts (Snap) ao passar o mouse no maximizar', 'Some o balão de layouts do Windows 11.', 's', 'se',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'EnableSnapAssistFlyout' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'EnableSnapAssistFlyout' 1`, true);
  T('m_bsod', 'tweak', 'Tela azul detalhada', 'Mostra os parâmetros do erro na tela azul (útil para diagnóstico).', 's', 't',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl' 'DisplayParameters' 1`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl' 'DisplayParameters' 0`);
  T('m_verbose', 'tweak', 'Mensagens detalhadas no logon e desligamento', 'Mostra o que o Windows está fazendo ("Aplicando configurações...").', 's', 't',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'VerboseStatus' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' 'VerboseStatus'`);
  T('m_sandbox', 'tweak', 'Habilitar o Windows Sandbox', 'Ambiente descartável para testar programas. Exige Windows Pro/Enterprise e virtualização ligada. Exige reinício.', 's', 't',
    R`Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All -NoRestart | Out-Null`,
    R`Disable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -NoRestart | Out-Null`);
  T('m_ssh', 'tweak', 'Instalar o cliente e o servidor OpenSSH', 'Habilita ssh/scp e o serviço sshd (inicia automático) com regra de firewall.', 'm', '',
    R`Add-WindowsCapability -Online -Name 'OpenSSH.Client~~~~0.0.1.0' | Out-Null
Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0' | Out-Null
Set-Service sshd -StartupType Automatic
Start-Service sshd`,
    R`Stop-Service sshd -ErrorAction SilentlyContinue
Remove-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0' | Out-Null`);

  /* grupos de escolha unica (marcar um desmarca os outros) */
  [['wuMode', ['u_default', 'u_security', 'u_disable']], ['plan', ['power', 'power_bal', 'power_high']], ['dns', ['dns', 'dns_goog', 'dns_q9', 'dns_odns', 'dns_adg']]]
    .forEach(function (g) { g[1].forEach(function (id) { ITEMS.forEach(function (i) { if (i.id === id) i.radio = g[0]; }); }); });
