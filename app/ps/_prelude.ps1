$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
$ConfirmPreference = 'None'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch { }
$OutputEncoding = [Text.Encoding]::UTF8

function Arg([string]$n, [string]$d = '') {
    $v = [Environment]::GetEnvironmentVariable('SNOW_ARG_' + $n)
    if ([string]::IsNullOrEmpty($v)) { $d } else { $v }
}
function Out-Json($o) {
    $a = @(@($o) | Where-Object { $null -ne $_ })
    if ($a.Count -eq 0) { '[]' } else { ConvertTo-Json -InputObject $a -Compress -Depth 6 }
}
function Out-JsonObj($o) { ConvertTo-Json -InputObject $o -Compress -Depth 6 }
function Step([string]$t) { Write-Host ('>> ' + $t) }
function Ok([string]$t) { Write-Host ('[OK] ' + $t) }
function Warn([string]$t) { Write-Host ('[!!] ' + $t) }
function Fail([string]$t) { Write-Host ('[XX] ' + $t) }
function Set-Reg($Path, $Name, $Value, $Type = 'DWord') {
    if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
    Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -Force -ErrorAction Stop
}
function Remove-Reg($Path, $Name) { Remove-ItemProperty -Path $Path -Name $Name -ErrorAction SilentlyContinue }
function Remove-App([string[]]$Names) {
    foreach ($n in $Names) {
        Get-AppxPackage -AllUsers -Name $n -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
        Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object DisplayName -like $n | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Out-Null
        Write-Host ('   removido: ' + $n)
    }
}
function Invoke-Step([string]$Name, [scriptblock]$Action) {
    Write-Host ''
    Write-Host ('>> ' + $Name)
    if ($Simulate) { Write-Host '   (simulacao: nada foi alterado)'; return }
    try { & $Action; Write-Host '[OK] concluido' }
    catch { Write-Host ('[XX] ' + $_.Exception.Message) }
}
function Size-Of([string]$p) {
    if (-not (Test-Path $p)) { return 0 }
    $m = Get-ChildItem -LiteralPath $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum
    if ($m.Sum) { [double]$m.Sum } else { 0 }
}
function Fmt-Bytes([double]$b) {
    if ($b -ge 1GB) { '{0:N2} GB' -f ($b / 1GB) } elseif ($b -ge 1MB) { '{0:N1} MB' -f ($b / 1MB) } else { '{0:N0} KB' -f ($b / 1KB) }
}

# ---------------------------------------------------------------------------
# SnowCleaner: catalogo de limpeza (usado por q_cleanscan.ps1 e a_cleanrun.ps1).
# A interface so envia IDs; os caminhos vivem apenas aqui (lista fechada).
# Compativel com Windows PowerShell 5.1.
# ---------------------------------------------------------------------------
function Norm-Sep([string]$p) { $p.Replace('\', [string][IO.Path]::DirectorySeparatorChar) }
function Join-Env([string]$base, [string]$rel) {
    if ([string]::IsNullOrWhiteSpace($base)) { return $null }
    if ($rel) { return (Join-Path $base (Norm-Sep $rel)) }
    return $base
}
function Expand-CPath([string]$p) {
    # devolve os diretorios existentes; aceita '*' em segmentos (ex.: perfis do Firefox)
    if ([string]::IsNullOrWhiteSpace($p)) { return @() }
    $p = Norm-Sep $p
    if ($p.Contains('*')) {
        $r = @(Get-Item -Path $p -Force -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer } | ForEach-Object { $_.FullName })
        return $r
    }
    if (Test-Path -LiteralPath $p -PathType Container) { return @($p) }
    return @()
}
function Test-CleanSafe([string]$p, [bool]$hasFilter = $false) {
    # Trava de seguranca: nunca age em raiz de disco, nem em pastas "grandes" do sistema/perfil
    # (a menos que o item use filtro de nomes fixos, como MEMORY.DMP).
    if ([string]::IsNullOrWhiteSpace($p)) { return $false }
    $sep = [IO.Path]::DirectorySeparatorChar
    try { $full = [IO.Path]::GetFullPath($p).TrimEnd($sep) } catch { return $false }
    if ($full.Length -lt 8) { return $false }
    if ($full.Split($sep).Count -lt 3) { return $false }
    $deny = @($env:windir, "$env:windir\System32", "$env:windir\SysWOW64", $env:ProgramData, $env:ProgramFiles, ${env:ProgramFiles(x86)},
        $env:USERPROFILE, $env:LOCALAPPDATA, $env:APPDATA, "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Documents",
        "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Pictures", "$env:USERPROFILE\Videos", "$env:USERPROFILE\Music") |
        Where-Object { $_ } | ForEach-Object { $_.TrimEnd($sep) }
    if (-not $hasFilter) { foreach ($d in $deny) { if ($full -ieq $d) { return $false } } }
    $okRoots = @($env:windir, $env:ProgramData, $env:LOCALAPPDATA, $env:APPDATA, $env:TEMP, $env:USERPROFILE) | Where-Object { $_ }
    foreach ($r in $okRoots) { if ($hasFilter -and ($full -ieq $r.TrimEnd($sep))) { return $true }; if ($full.StartsWith($r.TrimEnd($sep) + $sep, [StringComparison]::OrdinalIgnoreCase)) { return $true } }
    return $false
}
function New-CI([string]$id, [string]$group, [string]$label, [string]$desc, [string]$risk, $paths, $opt) {
    if (-not $opt) { $opt = @{} }
    $list = @()
    foreach ($p in @($paths)) { if ($p) { $list += $p } }
    $dirs = @()
    foreach ($p in $list) { $dirs += @(Expand-CPath $p) }
    [pscustomobject]@{
        id = $id; group = $group; label = $label; desc = $desc; risk = $risk
        admin = [bool]$opt.admin; special = [string]$opt.special; readonly = [bool]$opt.readonly
        ageDays = [int]$opt.ageDays; filter = @($opt.filter | Where-Object { $_ }); proc = @($opt.proc | Where-Object { $_ })
        paths = @($dirs | Select-Object -Unique)
    }
}
function Get-CleanCatalog {
    $L = $env:LOCALAPPDATA; $R = $env:APPDATA; $W = $env:windir; $PD = $env:ProgramData
    $c = New-Object System.Collections.ArrayList
    function A($x) { [void]$c.Add($x) }

    # --- Sistema ---
    A (New-CI 'temp_user' 'Sistema' 'Temporários do usuário' 'Arquivos da pasta Temp com mais de 1 dia. Os que estão em uso são ignorados.' 'safe' @($env:TEMP) @{ ageDays = 1 })
    A (New-CI 'temp_win' 'Sistema' 'Temporários do Windows' 'C:\Windows\Temp, apenas arquivos com mais de 1 dia.' 'safe' @((Join-Env $W 'Temp')) @{ ageDays = 1; admin = $true })
    A (New-CI 'recycle' 'Sistema' 'Lixeira' 'Esvazia a lixeira de todos os discos. Não dá para desfazer.' 'medium' @() @{ special = 'recycle' })
    A (New-CI 'dns' 'Sistema' 'Cache DNS' 'Limpa o cache de nomes (ipconfig /flushdns). Útil se um site não abre.' 'safe' @() @{ special = 'dns' })
    A (New-CI 'thumbs' 'Sistema' 'Cache de miniaturas e ícones' 'O Windows recria sozinho. Arquivos em uso pelo Explorer são ignorados.' 'safe' @((Join-Env $L 'Microsoft\Windows\Explorer')) @{ filter = @('thumbcache_*.db', 'iconcache_*.db') })
    A (New-CI 'inetcache' 'Sistema' 'Cache de internet do Windows' 'INetCache (usado pelo Explorer e alguns programas antigos).' 'safe' @((Join-Env $L 'Microsoft\Windows\INetCache')) @{})
    A (New-CI 'wer' 'Sistema' 'Relatórios de erro (WER)' 'Relatórios e filas de erros enviados à Microsoft.' 'safe' @((Join-Env $PD 'Microsoft\Windows\WER'), (Join-Env $L 'Microsoft\Windows\WER')) @{ admin = $true })
    A (New-CI 'crashdumps' 'Sistema' 'Despejos de falha de aplicativos' 'CrashDumps do usuário (.dmp gerados quando um programa fecha com erro).' 'safe' @((Join-Env $L 'CrashDumps')) @{})
    A (New-CI 'dumps' 'Sistema' 'Despejos de memória do Windows' 'Minidump e MEMORY.DMP (tela azul). Apague só se não for investigar a falha.' 'medium' @((Join-Env $W 'Minidump')) @{ admin = $true })
    A (New-CI 'memdmp' 'Sistema' 'MEMORY.DMP (tela azul completa)' 'Arquivo grande gerado em tela azul. Apague só se não for investigar a falha.' 'medium' @($W) @{ admin = $true; filter = @('MEMORY.DMP') })
    A (New-CI 'winupdate' 'Sistema' 'Cache do Windows Update' 'Arquivos já baixados de atualizações. O Windows baixa de novo se precisar.' 'medium' @((Join-Env $W 'SoftwareDistribution\Download')) @{ admin = $true })
    A (New-CI 'delivopt' 'Sistema' 'Otimização de Entrega' 'Cache de atualizações compartilhadas entre PCs.' 'medium' @((Join-Env $W 'ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache')) @{ admin = $true })
    A (New-CI 'cbslogs' 'Sistema' 'Logs antigos do CBS' 'Logs de manutenção do Windows com mais de 14 dias.' 'medium' @((Join-Env $W 'Logs\CBS')) @{ admin = $true; ageDays = 14 })
    A (New-CI 'shader' 'Sistema' 'Cache de shaders (DirectX / NVIDIA / AMD)' 'Jogos e apps recriam; a primeira abertura pode ficar um pouco mais lenta.' 'safe' @((Join-Env $L 'D3DSCache'), (Join-Env $L 'NVIDIA\DXCache'), (Join-Env $L 'NVIDIA\GLCache'), (Join-Env $L 'AMD\DxCache')) @{})
    A (New-CI 'dism' 'Sistema' 'Componentes antigos do Windows (WinSxS)' 'Roda DISM /StartComponentCleanup. Demora alguns minutos; o ganho não é medido antes.' 'careful' @() @{ special = 'dism'; admin = $true })
    A (New-CI 'winold' 'Sistema' 'Windows.old (instalação anterior)' 'Só informativo: para remover use a Limpeza de Disco do Windows (cleanmgr).' 'careful' @((Join-Env $env:SystemDrive '\Windows.old')) @{ readonly = $true; admin = $true })

    # --- Navegadores (somente cache; nunca senhas, cookies ou histórico) ---
    $br = @(
        @{ id = 'chrome'; name = 'Google Chrome'; base = (Join-Env $L 'Google\Chrome\User Data'); proc = 'chrome' },
        @{ id = 'edge'; name = 'Microsoft Edge'; base = (Join-Env $L 'Microsoft\Edge\User Data'); proc = 'msedge' },
        @{ id = 'brave'; name = 'Brave'; base = (Join-Env $L 'BraveSoftware\Brave-Browser\User Data'); proc = 'brave' }
    )
    foreach ($b in $br) {
        $paths = @()
        if ($b.base) {
            foreach ($sub in @('Cache', 'Code Cache', 'GPUCache', 'Service Worker\CacheStorage')) {
                $paths += (Join-Path $b.base ('Default\' + $sub))
                $paths += (Join-Path $b.base ('Profile *\' + $sub))
            }
            $paths += (Join-Path $b.base 'ShaderCache')
        }
        A (New-CI ('br_' + $b.id) 'Navegadores' ($b.name + ' (cache)') 'Somente cache de páginas. Mantém senhas, cookies e histórico. Feche o navegador antes.' 'safe' $paths @{ proc = @($b.proc) })
    }
    A (New-CI 'br_firefox' 'Navegadores' 'Mozilla Firefox (cache)' 'Somente cache de páginas. Mantém senhas, cookies e histórico. Feche o navegador antes.' 'safe' @((Join-Env $L 'Mozilla\Firefox\Profiles\*\cache2')) @{ proc = @('firefox') })

    # --- Aplicativos ---
    A (New-CI 'app_discord' 'Aplicativos' 'Discord (cache)' 'Cache de imagens e código. Mantém sua conta e conversas.' 'safe' @((Join-Env $R 'discord\Cache'), (Join-Env $R 'discord\Code Cache'), (Join-Env $R 'discord\GPUCache')) @{ proc = @('Discord') })
    A (New-CI 'app_spotify' 'Aplicativos' 'Spotify (cache)' 'Músicas em cache; o Spotify baixa de novo quando precisar.' 'safe' @((Join-Env $L 'Spotify\Data'), (Join-Env $L 'Spotify\Storage')) @{ proc = @('Spotify') })
    A (New-CI 'app_teams' 'Aplicativos' 'Microsoft Teams clássico (cache)' 'Cache do Teams (versão clássica). Feche o Teams antes.' 'safe' @((Join-Env $R 'Microsoft\Teams\Cache'), (Join-Env $R 'Microsoft\Teams\Code Cache'), (Join-Env $R 'Microsoft\Teams\GPUCache'), (Join-Env $R 'Microsoft\Teams\tmp')) @{ proc = @('Teams') })
    A (New-CI 'dev_npm' 'Desenvolvimento' 'Cache do npm' 'Pacotes baixados; o npm baixa de novo quando precisar.' 'medium' @((Join-Env $L 'npm-cache'), (Join-Env $R 'npm-cache')) @{})
    A (New-CI 'dev_pip' 'Desenvolvimento' 'Cache do pip' 'Pacotes Python baixados.' 'medium' @((Join-Env $L 'pip\Cache')) @{})
    A (New-CI 'dev_go' 'Desenvolvimento' 'Cache de compilação do Go' 'Compilações anteriores; a próxima compilação será mais lenta.' 'medium' @((Join-Env $L 'go-build')) @{})
    return $c.ToArray()
}

# Enumera arquivos sem seguir junctions/links simbolicos.
# $filter: curingas e NAO recursivo (so a pasta). $cutoff: so arquivos com LastWriteTime anterior.
function Get-CleanFiles([string]$root, $filter, $cutoff, $dirList) {
    $stack = New-Object System.Collections.Stack
    $stack.Push($root)
    while ($stack.Count -gt 0) {
        $d = [string]$stack.Pop()
        try { $entries = (New-Object IO.DirectoryInfo $d).GetFileSystemInfos() } catch { continue }
        foreach ($e in $entries) {
            if ($e.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            if ($e -is [IO.DirectoryInfo]) {
                if (-not $filter -or $filter.Count -eq 0) {
                    $stack.Push($e.FullName)
                    if ($null -ne $dirList) { [void]$dirList.Add($e) }
                }
            } else {
                if ($filter -and $filter.Count -gt 0) {
                    $hit = $false
                    foreach ($f in $filter) { if ($e.Name -like $f) { $hit = $true; break } }
                    if (-not $hit) { continue }
                }
                if ($cutoff -and $e.LastWriteTime -ge $cutoff) { continue }
                $e
            }
        }
    }
}
function Measure-CleanItem($it) {
    $bytes = 0.0; $files = 0
    if ($it.special -eq 'recycle') {
        try {
            $sh = New-Object -ComObject Shell.Application
            $items = $sh.NameSpace(0xA).Items()
            foreach ($i in $items) { $files++; $bytes += [double]$i.Size }
        } catch { }
    } elseif ($it.special -eq 'dns') {
    } elseif ($it.special -eq 'dism') {
        $bytes = -1
    } else {
        $cutoff = $null
        if ($it.ageDays -gt 0) { $cutoff = (Get-Date).AddDays(-$it.ageDays) }
        foreach ($p in $it.paths) {
            if (-not (Test-CleanSafe $p ($it.filter.Count -gt 0)) -and -not $it.readonly) { continue }
            foreach ($f in (Get-CleanFiles $p $it.filter $cutoff $null)) { $files++; $bytes += [double]$f.Length }
        }
    }
    [pscustomobject]@{ bytes = $bytes; files = $files }
}
