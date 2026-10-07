# SnowCleaner: executa a limpeza dos itens escolhidos (somente IDs do catalogo).
$sim = (Arg 'SIM' '0') -eq '1'
$ids = @((Arg 'IDS' '') -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($ids.Count -eq 0) { Warn 'Nenhum item selecionado.'; return }
$catalog = @(Get-CleanCatalog)
$drive = $env:SystemDrive.TrimEnd(':')
$free0 = 0.0
try { $free0 = [double](Get-PSDrive -Name $drive).Free } catch { }
$total = 0.0; $totalFiles = 0; $totalFail = 0
if ($sim) { Step 'Simulação: nada será apagado' }

foreach ($id in $ids) {
    $it = $catalog | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if (-not $it) { Warn ('Item desconhecido ignorado: ' + $id); continue }
    if ($it.readonly) { Warn ($it.label + ': somente informativo (use a Limpeza de Disco do Windows).'); continue }
    Step $it.label
    foreach ($pn in $it.proc) { if (Get-Process -Name $pn -ErrorAction SilentlyContinue) { Warn ('   ' + $pn + ' está aberto; arquivos em uso serão ignorados.') } }

    if ($it.special -eq 'recycle') {
        $m = Measure-CleanItem $it
        $total += $m.bytes; $totalFiles += $m.files
        if (-not $sim) { Clear-RecycleBin -Force -ErrorAction SilentlyContinue }
        Write-Host ('   ' + $m.files + ' itens, ' + (Fmt-Bytes $m.bytes))
        continue
    }
    if ($it.special -eq 'dns') {
        if (-not $sim) { ipconfig /flushdns | Out-Null }
        Write-Host '   cache DNS limpo'
        continue
    }
    if ($it.special -eq 'dism') {
        if ($sim) { Write-Host '   (simulacao: DISM não foi executado)' }
        else {
            Write-Host '   executando DISM (pode demorar alguns minutos)...'
            DISM /Online /Cleanup-Image /StartComponentCleanup
        }
        continue
    }

    $cutoff = $null
    if ($it.ageDays -gt 0) { $cutoff = (Get-Date).AddDays(-$it.ageDays) }
    $bytes = 0.0; $n = 0; $fail = 0
    foreach ($p in $it.paths) {
        if (-not (Test-CleanSafe $p ($it.filter.Count -gt 0))) { Warn ('   caminho recusado pela trava de segurança: ' + $p); continue }
        $dirs = New-Object System.Collections.ArrayList
        foreach ($f in @(Get-CleanFiles $p $it.filter $cutoff $dirs)) {
            if ($sim) { $bytes += [double]$f.Length; $n++; continue }
            try {
                if ($f.IsReadOnly) { $f.IsReadOnly = $false }
                $len = [double]$f.Length
                $f.Delete()
                $bytes += $len; $n++
            } catch { $fail++ }
        }
        if (-not $sim -and (-not $it.filter -or $it.filter.Count -eq 0)) {
            # remove subpastas que ficaram vazias (a pasta raiz do item nunca e removida)
            for ($i = $dirs.Count - 1; $i -ge 0; $i--) {
                $d = $dirs[$i]
                try {
                    if (-not $cutoff -or $d.LastWriteTime -lt $cutoff) { [IO.Directory]::Delete($d.FullName, $false) }
                } catch { }
            }
        }
    }
    $total += $bytes; $totalFiles += $n; $totalFail += $fail
    $line = '   ' + $n + ' arquivos, ' + (Fmt-Bytes $bytes)
    if ($fail -gt 0) { $line += ' (' + $fail + ' em uso, ignorados)' }
    Write-Host $line
}

if ($sim) {
    Ok ('Simulação: cerca de ' + (Fmt-Bytes $total) + ' em ' + $totalFiles + ' arquivos poderiam ser liberados.')
} else {
    $free1 = $free0
    try { $free1 = [double](Get-PSDrive -Name $drive).Free } catch { }
    $msg = 'Limpeza concluída: ' + $totalFiles + ' arquivos, ' + (Fmt-Bytes $total) + ' apagados. Espaço livre em ' + $drive + ': ' + (Fmt-Bytes $free0) + ' -> ' + (Fmt-Bytes $free1)
    Ok $msg
    if ($totalFail -gt 0) { Warn ($totalFail + ' arquivos estavam em uso e foram mantidos.') }
}
