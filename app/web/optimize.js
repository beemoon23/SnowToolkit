'use strict';
(function () {
  var SN = window.SN, h = SN.h;
  var R = String.raw;
  var CATS = [
    { id: 'priv', name: 'Privacidade' },
    { id: 'tel', name: 'Telemetria' },
    { id: 'upd', name: 'Windows Update' },
    { id: 'perf', name: 'Desempenho' },
    { id: 'game', name: 'Jogos' },
    { id: 'deb', name: 'Debloat' },
    { id: 'tweak', name: 'Ajustes' },
    { id: 'apps', name: 'Apps' }
  ];
  var RISK = { s: 'Seguro', m: 'Moderado', c: 'Cuidado' };
  var ITEMS = [];
  /* T(id, categoria, titulo, descricao, risco, perfis, aplicar, desfazer, reiniciarExplorer) */
  function T(id, cat, title, desc, risk, p, doIt, undo, x) {
    ITEMS.push({ id: id, cat: cat, title: title, desc: desc, risk: risk, p: p, doIt: doIt, undo: undo || null, x: !!x });
  }

  /* ---------- PRIVACIDADE ---------- */
  T('tel', 'priv', 'Desativar telemetria e coleta de dados',
    'Reduz a coleta ao mínimo que a sua edição permite e desliga os serviços DiagTrack e dmwappushservice.', 's', 'rgtm',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry' 0
foreach ($s in 'DiagTrack','dmwappushservice') { Stop-Service $s -Force -ErrorAction SilentlyContinue; Set-Service $s -StartupType Disabled -ErrorAction SilentlyContinue }`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' 'AllowTelemetry'
Set-Service 'DiagTrack' -StartupType Automatic -ErrorAction SilentlyContinue
Set-Service 'dmwappushservice' -StartupType Manual -ErrorAction SilentlyContinue
Start-Service 'DiagTrack' -ErrorAction SilentlyContinue`);

  T('tasks', 'priv', 'Desligar tarefas agendadas de telemetria',
    'Desativa o Compatibility Appraiser, ProgramDataUpdater e os coletores do programa de experiência do cliente.', 's', 'rgt',
    R`$tasks = '\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser','\Microsoft\Windows\Application Experience\ProgramDataUpdater','\Microsoft\Windows\Customer Experience Improvement Program\Consolidator','\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip'
foreach ($t in $tasks) { schtasks /Change /TN $t /Disable 2>$null | Out-Null }`,
    R`$tasks = '\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser','\Microsoft\Windows\Application Experience\ProgramDataUpdater','\Microsoft\Windows\Customer Experience Improvement Program\Consolidator','\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip'
foreach ($t in $tasks) { schtasks /Change /TN $t /Enable 2>$null | Out-Null }`);

  T('adid', 'priv', 'Desativar ID de publicidade e experiências personalizadas',
    'Impede que apps usem o identificador de anúncios e que o Windows personalize dicas com seus dados de diagnóstico.', 's', 'rgtm',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 0
Set-Reg 'HKCU:\Software\Policies\Microsoft\Windows\CloudContent' 'DisableTailoredExperiencesWithDiagnosticData' 1`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo' 'Enabled' 1
Remove-Reg 'HKCU:\Software\Policies\Microsoft\Windows\CloudContent' 'DisableTailoredExperiencesWithDiagnosticData'`);

  T('sugg', 'priv', 'Remover sugestões e anúncios do Windows',
    'Tira propaganda do Menu Iniciar, da tela de bloqueio e das Configurações, e a instalação silenciosa de apps.', 's', 'rgtm',
    R`$cdm = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
foreach ($k in 'ContentDeliveryAllowed','OemPreInstalledAppsEnabled','PreInstalledAppsEnabled','SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SoftLandingEnabled','RotatingLockScreenOverlayEnabled','SubscribedContent-338387Enabled','SubscribedContent-338388Enabled','SubscribedContent-338389Enabled','SubscribedContent-353694Enabled','SubscribedContent-353696Enabled','SubscribedContent-310093Enabled') { Set-Reg $cdm $k 0 }`,
    R`$cdm = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager'
foreach ($k in 'ContentDeliveryAllowed','OemPreInstalledAppsEnabled','PreInstalledAppsEnabled','SilentInstalledAppsEnabled','SystemPaneSuggestionsEnabled','SoftLandingEnabled','RotatingLockScreenOverlayEnabled','SubscribedContent-338387Enabled','SubscribedContent-338388Enabled','SubscribedContent-338389Enabled','SubscribedContent-353694Enabled','SubscribedContent-353696Enabled','SubscribedContent-310093Enabled') { Set-Reg $cdm $k 1 }`);

  T('consumer', 'priv', 'Bloquear apps patrocinados (Consumer Features)',
    'Impede o Windows de baixar apps promocionais sozinho, inclusive para usuários novos.', 's', 'rgtm',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsConsumerFeatures' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent' 'DisableWindowsConsumerFeatures'`);

  T('bing', 'priv', 'Pesquisa do Windows sem resultados do Bing',
    'A busca do Menu Iniciar passa a procurar só no computador.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' 'DisableSearchBoxSuggestions' 1`,
    R`Remove-Reg 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' 'DisableSearchBoxSuggestions'`, true);

  T('copilot', 'priv', 'Desligar Copilot e análise de dados por IA (Recall)',
    'Aplica as políticas que desativam o Copilot e o salvamento de capturas para a IA.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot' 1
Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' 'DisableAIDataAnalysis' 1`,
    R`Remove-Reg 'HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot' 'TurnOffWindowsCopilot'
Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' 'DisableAIDataAnalysis'`);

  T('widgets', 'priv', 'Desligar Widgets e Notícias',
    'Remove o painel de notícias e interesses que consome rede e memória em segundo plano.', 's', 'rgt',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests' 0`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Dsh' 'AllowNewsAndInterests'`);

  T('activity', 'priv', 'Desativar histórico de atividades',
    'Para de registrar e enviar a linha do tempo de atividades para a Microsoft.', 's', 'rt',
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System'
Set-Reg $k 'EnableActivityFeed' 0
Set-Reg $k 'PublishUserActivities' 0
Set-Reg $k 'UploadUserActivities' 0`,
    R`$k = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System'
Remove-Reg $k 'EnableActivityFeed'
Remove-Reg $k 'PublishUserActivities'
Remove-Reg $k 'UploadUserActivities'`);

  T('loc', 'priv', 'Desativar localização do sistema',
    'Desliga o serviço de localização para todos os apps. Mapas e clima deixam de se ajustar sozinhos.', 'm', '',
    R`Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' 'DisableLocation' 1`,
    R`Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' 'DisableLocation'`);

  T('wer', 'priv', 'Desativar relatório de erros do Windows',
    'Para o envio de relatórios de falha. Fica mais difícil abrir chamado com a Microsoft sobre travamentos.', 'm', '',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' 'Disabled' 1
Stop-Service 'WerSvc' -Force -ErrorAction SilentlyContinue
Set-Service 'WerSvc' -StartupType Disabled -ErrorAction SilentlyContinue`,
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' 'Disabled' 0
Set-Service 'WerSvc' -StartupType Manual -ErrorAction SilentlyContinue`);

  /* ---------- DESEMPENHO ---------- */
  T('power', 'perf', 'Plano de energia Desempenho Máximo',
    'Ativa o plano Ultimate Performance (ou Alto Desempenho se não existir). Em notebook, gasta mais bateria.', 'm', 'g',
    R`$out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
$m = $out | Select-String -Pattern '[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}'
if ($m) { powercfg -setactive $m.Matches[0].Value } else { powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c }`,
    R`powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`);

  T('hiber', 'perf', 'Desligar hibernação e Fast Startup',
    'Libera vários GB no C: e evita o "desligar que não desliga". Notebook perde a hibernação.', 'm', '',
    R`powercfg /h off
Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 0`,
    R`powercfg /h on
Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' 'HiberbootEnabled' 1`);

  T('sysmain', 'perf', 'Desativar SysMain (Superfetch)',
    'Faz sentido só quando o Windows está em SSD. Em HDD, deixe ligado.', 'm', '',
    R`Stop-Service 'SysMain' -Force -ErrorAction SilentlyContinue
Set-Service 'SysMain' -StartupType Disabled`,
    R`Set-Service 'SysMain' -StartupType Automatic
Start-Service 'SysMain' -ErrorAction SilentlyContinue`);

  T('visual', 'perf', 'Menos transparência e animações',
    'Desliga a transparência das janelas e a animação de minimizar. Ajuda em PC fraco.', 's', '',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 0
Set-Reg 'HKCU:\Control Panel\Desktop\WindowMetrics' 'MinAnimate' '0' 'String'`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 1
Set-Reg 'HKCU:\Control Panel\Desktop\WindowMetrics' 'MinAnimate' '1' 'String'`);

  T('dvr', 'perf', 'Desligar captura em segundo plano do Game Bar (Game DVR)',
    'Para a gravação automática de clipes, que custa FPS. A barra de jogos continua abrindo com Win+G.', 's', 'g',
    R`Set-Reg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0
Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0`,
    R`Set-Reg 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 1
Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 1`);

  T('svc', 'perf', 'Serviços raramente usados para manual',
    'Fax, Mapas, Modo Demo de loja e compartilhamento do Media Player passam a iniciar só quando necessários.', 's', 'rgt',
    R`foreach ($s in 'Fax','MapsBroker','RetailDemo','WMPNetworkSvc') { Set-Service $s -StartupType Manual -ErrorAction SilentlyContinue }`,
    R`Set-Service 'MapsBroker' -StartupType Automatic -ErrorAction SilentlyContinue`);

  T('bgapps', 'perf', 'Impedir apps da Store de rodarem em segundo plano',
    'Economiza RAM e bateria. Apps como e-mail e mensageiros deixam de notificar com o app fechado.', 'm', '',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' 'GlobalUserDisabled' 1
Set-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsRunInBackground' 2`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' 'GlobalUserDisabled' 0
Remove-Reg 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy' 'LetAppsRunInBackground'`);

  T('do', 'perf', 'Atualizações só pela internet (sem P2P)',
    'Desativa o compartilhamento de atualizações com outros PCs, que usa upload da sua rede.', 's', 'rt',
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config' 'DODownloadMode' 0`,
    R`Set-Reg 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config' 'DODownloadMode' 1`);

  T('startdelay', 'perf', 'Remover atraso dos programas de inicialização',
    'O Windows espera alguns segundos antes de abrir os itens de inicialização. Isso zera a espera.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' 'StartupDelayInMSec' 0`,
    R`Remove-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' 'StartupDelayInMSec'`);

  T('dns', 'perf', 'DNS Cloudflare (1.1.1.1) nas placas ativas',
    'Troca o DNS das placas conectadas. Não use em rede com servidor DNS interno (domínio, nomes de máquinas locais).', 'c', '',
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses '1.1.1.1','1.0.0.1' }
ipconfig /flushdns | Out-Null`,
    R`Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses }
ipconfig /flushdns | Out-Null`);

  /* ---------- AJUSTES ---------- */
  T('ext', 'tweak', 'Mostrar extensões e arquivos ocultos',
    'Essencial para quem trabalha com suporte: vê .exe disfarçado de .pdf e arquivos de sistema.', 's', 'rgtm',
    R`$adv = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
Set-Reg $adv 'HideFileExt' 0
Set-Reg $adv 'Hidden' 1`,
    R`$adv = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
Set-Reg $adv 'HideFileExt' 1
Set-Reg $adv 'Hidden' 2`, true);

  T('thispc', 'tweak', 'Explorador abre em "Este Computador"',
    'Em vez de Acesso Rápido, mostra os discos e unidades de rede logo de cara.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'LaunchTo' 1`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'LaunchTo' 2`, true);

  T('ctx', 'tweak', 'Menu de contexto clássico (Windows 11)',
    'Volta o botão direito completo, sem o "Mostrar mais opções".', 's', 'rgt',
    R`reg add 'HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32' /f /ve | Out-Null`,
    R`reg delete 'HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}' /f | Out-Null`, true);

  T('taskbar', 'tweak', 'Barra de tarefas enxuta',
    'Esconde a caixa de pesquisa, o botão Visão de Tarefas e o botão de Widgets.', 's', 'rgt',
    R`$adv = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
Set-Reg $adv 'ShowTaskViewButton' 0
Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'SearchboxTaskbarMode' 0
try { Set-Reg $adv 'TaskbarDa' 0 } catch { Write-Host '   (o botao Widgets e protegido nesta versao do Windows)' -ForegroundColor DarkYellow }`,
    R`$adv = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
Set-Reg $adv 'ShowTaskViewButton' 1
Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'SearchboxTaskbarMode' 2
try { Set-Reg $adv 'TaskbarDa' 1 } catch { }`, true);

  T('align', 'tweak', 'Alinhar a barra de tarefas à esquerda (Windows 11)',
    'Menu Iniciar e ícones no canto, como no Windows 10.', 's', 't',
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarAl' 0`,
    R`Set-Reg 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'TaskbarAl' 1`, true);

  T('sticky', 'tweak', 'Desativar o aviso das Teclas de Aderência',
    'Acabou a janela chata ao apertar Shift cinco vezes, muito comum em jogos e no atendimento.', 's', 'rgt',
    R`Set-Reg 'HKCU:\Control Panel\Accessibility\StickyKeys' 'Flags' '506' 'String'`,
    R`Set-Reg 'HKCU:\Control Panel\Accessibility\StickyKeys' 'Flags' '510' 'String'`);

  T('dark', 'tweak', 'Tema escuro no sistema e nos apps',
    'Ativa o modo escuro do Windows e dos aplicativos compatíveis.', 's', '',
    R`$p = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
Set-Reg $p 'AppsUseLightTheme' 0
Set-Reg $p 'SystemUsesLightTheme' 0`,
    R`$p = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
Set-Reg $p 'AppsUseLightTheme' 1
Set-Reg $p 'SystemUsesLightTheme' 1`, true);

  T('desk', 'tweak', 'Ícones Este Computador, Usuário e Painel de Controle na área de trabalho',
    'Traz de volta os atalhos clássicos que o Windows novo esconde.', 's', 'rt',
    R`$k = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel'
foreach ($g in '{20D04FE0-3AEA-1069-A2D8-08002B30309D}','{59031a47-3f72-44a7-89c5-5595fe6b30ee}','{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}') { Set-Reg $k $g 0 }`,
    R`$k = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\HideDesktopIcons\NewStartPanel'
foreach ($g in '{20D04FE0-3AEA-1069-A2D8-08002B30309D}','{59031a47-3f72-44a7-89c5-5595fe6b30ee}','{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}') { Set-Reg $k $g 1 }`, true);

  T('longpath', 'tweak', 'Habilitar caminhos longos (mais de 260 caracteres)',
    'Evita erros ao copiar ou apagar pastas muito profundas, como node_modules.', 's', 't',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' 'LongPathsEnabled' 1`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' 'LongPathsEnabled' 0`);

  T('tz', 'tweak', 'Fuso de Brasília, região Brasil e sincronizar a hora',
    'Ajusta o relógio, a região e força a sincronização com o servidor de hora.', 's', 'rt',
    R`Set-TimeZone -Id 'E. South America Standard Time'
Set-WinHomeLocation -GeoId 32
Start-Service w32time -ErrorAction SilentlyContinue
w32tm /resync | Out-Null`, null);

  T('smb1', 'tweak', 'Desativar o protocolo SMB1',
    'Protocolo antigo e inseguro. Alguns scanners e NAS velhos só falam SMB1, então teste antes.', 'm', 't',
    R`Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart | Out-Null`,
    R`Enable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart | Out-Null`);

  T('wsl', 'tweak', 'Instalar WSL2 com Ubuntu',
    'Linux dentro do Windows. Pede reinicialização no final.', 's', 't',
    R`wsl --install --no-launch`, null);

  T('netfx', 'tweak', 'Habilitar .NET Framework 3.5 e cliente Telnet',
    'O .NET 3.5 é pedido por programas antigos. O Telnet serve para testar portas.', 's', 't',
    R`Enable-WindowsOptionalFeature -Online -FeatureName NetFx3 -All -NoRestart | Out-Null
Enable-WindowsOptionalFeature -Online -FeatureName TelnetClient -NoRestart | Out-Null`,
    R`Disable-WindowsOptionalFeature -Online -FeatureName TelnetClient -NoRestart | Out-Null
Disable-WindowsOptionalFeature -Online -FeatureName NetFx3 -NoRestart | Out-Null`);

  T('wu', 'tweak', 'Instalar todas as atualizações do Windows (com drivers)',
    'Usa o módulo PSWindowsUpdate. Pode demorar bastante e pedir reinicialização.', 'm', '',
    R`if (-not (Get-Module -ListAvailable PSWindowsUpdate)) { Install-PackageProvider -Name NuGet -Force | Out-Null; Install-Module PSWindowsUpdate -Force }
Import-Module PSWindowsUpdate
Install-WindowsUpdate -AcceptAll -IgnoreReboot`, null);

  T('rdp', 'tweak', 'Habilitar Área de Trabalho Remota (RDP)',
    'Libera conexão remota neste PC e abre a regra no firewall. Exige Windows Pro. Exponha só em rede confiável.', 'c', '',
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' 'fDenyTSConnections' 0
Enable-NetFirewallRule -Group '@FirewallAPI.dll,-28752'`,
    R`Set-Reg 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' 'fDenyTSConnections' 1
Disable-NetFirewallRule -Group '@FirewallAPI.dll,-28752'`);

  /* ---------- DEBLOAT ---------- */
  T('d_bing', 'deb', 'Notícias, Clima e Pesquisa Bing', 'Microsoft.BingNews, BingWeather, BingSearch.', 's', 'rgt',
    R`Remove-App 'Microsoft.BingNews','Microsoft.BingWeather','Microsoft.BingSearch'`);
  T('d_help', 'deb', 'Obter Ajuda, Dicas e Hub de Comentários', 'GetHelp, Getstarted e WindowsFeedbackHub.', 's', 'rgt',
    R`Remove-App 'Microsoft.GetHelp','Microsoft.Getstarted','Microsoft.WindowsFeedbackHub'`);
  T('d_office', 'deb', 'Office Hub, Paciência e Candy Crush', 'Atalhos promocionais e jogos que vêm de fábrica.', 's', 'rgt',
    R`Remove-App 'Microsoft.MicrosoftOfficeHub','Microsoft.MicrosoftSolitaireCollection','*CandyCrush*'`);
  T('d_social', 'deb', 'Apps pré-instalados de redes sociais e streaming', 'TikTok, Disney+, Netflix, Facebook, Instagram, LinkedIn, Twitter e Amazon. Usa curinga e também remove versões que você instalou pela Store.', 'm', 'rgt',
    R`Remove-App '*TikTok*','*Disney*','*Netflix*','*Facebook*','*Instagram*','*LinkedIn*','*Twitter*','*Amazon*','*Spotify*'`);
  T('d_zune', 'deb', 'Groove Música e Filmes e TV', 'Players antigos da Microsoft (ZuneMusic e ZuneVideo).', 's', 'rgt',
    R`Remove-App 'Microsoft.ZuneMusic','Microsoft.ZuneVideo'`);
  T('d_mr', 'deb', 'Realidade Mista, Visualizador 3D e Paint 3D', 'MixedReality.Portal, 3DViewer, 3DBuilder e Print3D.', 's', 'rgt',
    R`Remove-App 'Microsoft.MixedReality.Portal','Microsoft.Microsoft3DViewer','Microsoft.3DBuilder','Microsoft.Print3D'`);
  T('d_skype', 'deb', 'Skype e Teams pessoal', 'Versões de consumidor. Não afeta o Teams corporativo instalado à parte.', 's', 'rt',
    R`Remove-App 'Microsoft.SkypeApp','MicrosoftTeams','MSTeams'`);
  T('d_misc', 'deb', 'Clipchamp, To Do, Power Automate, Dev Home, Mapas e Cortana', 'Apps que quase ninguém abre.', 's', 'rt',
    R`Remove-App 'Clipchamp.Clipchamp','Microsoft.Todos','Microsoft.PowerAutomateDesktop','Microsoft.Windows.DevHome','Microsoft.WindowsMaps','Microsoft.549981C3F5F10'`);
  T('d_copilot', 'deb', 'App do Copilot', 'Remove o aplicativo. As políticas ficam na aba Privacidade.', 's', 'rgt',
    R`Remove-App 'Microsoft.Copilot'`);
  T('d_mail', 'deb', 'Email e Calendário, Pessoas', 'Se você usa o app Email e Calendário do Windows, deixe desmarcado.', 'm', '',
    R`Remove-App 'Microsoft.People','microsoft.windowscommunicationsapps'`);
  T('d_phone', 'deb', 'Seu Telefone (Phone Link)', 'Remove a integração com celular. Quem usa o Phone Link perde o espelhamento.', 'm', '',
    R`Remove-App 'Microsoft.YourPhone','MicrosoftWindows.CrossDevice'`);
  T('d_onedrive', 'deb', 'Desinstalar o OneDrive', 'Confirme antes que nada seu está só na nuvem. Pastas sincronizadas deixam de atualizar.', 'c', '',
    R`Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue
$setup = Join-Path $env:SystemRoot 'SysWOW64\OneDriveSetup.exe'
if (-not (Test-Path $setup)) { $setup = Join-Path $env:SystemRoot 'System32\OneDriveSetup.exe' }
if (Test-Path $setup) { Start-Process $setup -ArgumentList '/uninstall' -Wait } else { winget uninstall --id Microsoft.OneDrive -e --silent }`);
  T('d_xbox', 'deb', 'Apps do Xbox e Game Bar', 'Quebra Game Pass, o app Xbox e a barra de jogos. Mantém o provedor de login para Minecraft e similares.', 'c', '',
    R`Remove-App 'Microsoft.GamingApp','Microsoft.XboxGamingOverlay','Microsoft.XboxGameOverlay','Microsoft.Xbox.TCUI','Microsoft.XboxSpeechToTextOverlay'`);


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
  /* ---------- APPS (winget) ---------- */
  var APPGROUPS = [
    { name: 'Navegadores', apps: [['Google.Chrome', 'Google Chrome', 'rgt'], ['Mozilla.Firefox', 'Firefox', ''], ['Brave.Brave', 'Brave', '']] },
    { name: 'Essenciais', apps: [['7zip.7zip', '7-Zip', 'rgt'], ['VideoLAN.VLC', 'VLC', 'rgt'], ['Notepad++.Notepad++', 'Notepad++', 'rt'], ['voidtools.Everything', 'Everything (busca instantânea)', 'rt'], ['Microsoft.PowerToys', 'PowerToys', 't'], ['Bitwarden.Bitwarden', 'Bitwarden', 't'], ['SumatraPDF.SumatraPDF', 'SumatraPDF', ''], ['TheDocumentFoundation.LibreOffice', 'LibreOffice', ''], ['Obsidian.Obsidian', 'Obsidian', '']] },
    { name: 'Desenvolvimento', apps: [['Microsoft.WindowsTerminal', 'Windows Terminal', 'rt'], ['Microsoft.PowerShell', 'PowerShell 7', 't'], ['Git.Git', 'Git', 't'], ['Microsoft.VisualStudioCode', 'Visual Studio Code', 't'], ['OpenJS.NodeJS.LTS', 'Node.js LTS', 't'], ['Python.Python.3.12', 'Python 3.12', 't'], ['Docker.DockerDesktop', 'Docker Desktop', ''], ['GitHub.GitHubDesktop', 'GitHub Desktop', ''], ['Postman.Postman', 'Postman', ''], ['WinMerge.WinMerge', 'WinMerge', 't'], ['HeidiSQL.HeidiSQL', 'HeidiSQL', '']] },
    { name: 'T.I. e rede', apps: [['Microsoft.Sysinternals.Suite', 'Sysinternals Suite', 't'], ['WiresharkFoundation.Wireshark', 'Wireshark', 't'], ['Insecure.Nmap', 'Nmap', 't'], ['Famatech.AdvancedIPScanner', 'Advanced IP Scanner', 't'], ['PuTTY.PuTTY', 'PuTTY', 't'], ['WinSCP.WinSCP', 'WinSCP', 't'], ['TimKosse.FileZilla.Client', 'FileZilla', ''], ['RustDesk.RustDesk', 'RustDesk', 't'], ['Tailscale.Tailscale', 'Tailscale', 't'], ['AnyDesk.AnyDesk', 'AnyDesk', '']] },
    { name: 'Hardware, disco e boot', apps: [['REALiX.HWiNFO', 'HWiNFO', 'gt'], ['CPUID.CPU-Z', 'CPU-Z', 't'], ['CPUID.HWMonitor', 'HWMonitor', ''], ['TechPowerUp.GPU-Z', 'GPU-Z', 'gt'], ['CrystalDewWorld.CrystalDiskInfo', 'CrystalDiskInfo', 'gt'], ['CrystalDewWorld.CrystalDiskMark', 'CrystalDiskMark', ''], ['WinDirStat.WinDirStat', 'WinDirStat', ''], ['AntibodySoftware.WizTree', 'WizTree', 't'], ['Wagnardsoft.DisplayDriverUninstaller', 'Display Driver Uninstaller', 'g'], ['Rufus.Rufus', 'Rufus', 't'], ['Ventoy.Ventoy', 'Ventoy', 't']] },
    { name: 'Mídia e jogos', apps: [['Valve.Steam', 'Steam', 'g'], ['EpicGames.EpicGamesLauncher', 'Epic Games Launcher', ''], ['Discord.Discord', 'Discord', 'g'], ['OBSProject.OBSStudio', 'OBS Studio', 'g'], ['HandBrake.HandBrake', 'HandBrake', ''], ['ShareX.ShareX', 'ShareX', 't'], ['Audacity.Audacity', 'Audacity', ''], ['GIMP.GIMP', 'GIMP', ''], ['Spotify.Spotify', 'Spotify', '']] }
  ];
  APPGROUPS.forEach(function (g) {
    g.apps.forEach(function (a) {
      ITEMS.push({ id: 'a:' + a[0], cat: 'apps', group: g.name, title: a[1], desc: a[0], wid: a[0], risk: 's', p: a[2], doIt: null, undo: null, x: false });
    });
  });

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
})();
