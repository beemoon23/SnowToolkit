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
