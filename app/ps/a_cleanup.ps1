$mode = Arg 'MODE' 'quick'
$browsers = (Arg 'BROWSERS' '0') -eq '1'
$sim = (Arg 'SIM' '0') -eq '1'
$targets = New-Object System.Collections.ArrayList
function Add-T([string]$label, [string]$path) { [void]$targets.Add([pscustomobject]@{ label = $label; path = $path }) }
Add-T 'Temporários do usuário' $env:TEMP
Add-T 'Temporários do Windows' "$env:windir\Temp"
Add-T 'Relatórios de erro (WER)' "$env:ProgramData\Microsoft\Windows\WER"
Add-T 'Cache de miniaturas' "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
if ($mode -eq 'deep') {
    Add-T 'Cache do Windows Update' "$env:windir\SoftwareDistribution\Download"
    Add-T 'Cache do Delivery Optimization' "$env:windir\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache"
    Add-T 'Minidumps' "$env:windir\Minidump"
    Add-T 'Logs do CBS (antigos)' "$env:windir\Logs\CBS"
}
if ($browsers) {
    foreach ($b in @(@('Chrome', "$env:LOCALAPPDATA\Google\Chrome\User Data"), @('Edge', "$env:LOCALAPPDATA\Microsoft\Edge\User Data"))) {
        if (Test-Path $b[1]) {
            foreach ($prof in (Get-ChildItem $b[1] -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })) {
                Add-T ($b[0] + ' cache (' + $prof.Name + ')') ($prof.FullName + '\Cache')
                Add-T ($b[0] + ' code cache (' + $prof.Name + ')') ($prof.FullName + '\Code Cache')
            }
        }
    }
}
$free0 = (Get-PSDrive -Name ($env:SystemDrive.TrimEnd(':'))).Free
$total = 0.0
foreach ($t in $targets) {
    if (-not (Test-Path -LiteralPath $t.path)) { continue }
    Step $t.label
    $before = 0.0
    if ($t.label -eq 'Cache de miniaturas') {
        $files = Get-ChildItem -LiteralPath $t.path -Filter 'thumbcache_*.db' -Force -ErrorAction SilentlyContinue
        $before = [double](($files | Measure-Object Length -Sum).Sum)
        if (-not $sim) { $files | Remove-Item -Force -ErrorAction SilentlyContinue }
    } else {
        $before = Size-Of $t.path
        if (-not $sim) { Get-ChildItem -LiteralPath $t.path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue }
    }
    $total += $before
    Write-Host ('   ' + (Fmt-Bytes $before))
}
Step 'Lixeira'
if (-not $sim) { Clear-RecycleBin -Force -ErrorAction SilentlyContinue }
Step 'Cache DNS'
if (-not $sim) { ipconfig /flushdns | Out-Null }
if ($mode -eq 'deep' -and -not $sim) {
    Step 'Componentes antigos do WinSxS (pode demorar)'
    DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
}
$free1 = (Get-PSDrive -Name ($env:SystemDrive.TrimEnd(':'))).Free
if ($sim) { Ok ('Simulação: cerca de ' + (Fmt-Bytes $total) + ' poderiam ser liberados.') }
else { Ok ('Limpeza concluída. Espaço livre: ' + (Fmt-Bytes $free0) + ' -> ' + (Fmt-Bytes $free1) + ' (liberado: ' + (Fmt-Bytes ([math]::Max(0, $free1 - $free0))) + ')') }
