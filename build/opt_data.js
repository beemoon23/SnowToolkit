  var R = String.raw;
  var CATS = [
    { id: 'priv', name: 'Privacidade' },
    { id: 'perf', name: 'Desempenho' },
    { id: 'tweak', name: 'Ajustes' },
    { id: 'deb', name: 'Debloat' },
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
