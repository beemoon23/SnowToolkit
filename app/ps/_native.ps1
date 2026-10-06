# --- Saida correta de programas nativos do Windows (somente nas ACOES; as consultas nao usam isto) ---
# O Windows em portugues escreve DISM, CHKDSK, IPCONFIG, NETSH... no codigo OEM do console (CP850) e o SFC em UTF-16.
# Estas funcoes sombreiam esses comandos: iniciam o programa, leem a saida com a codificacao CERTA e devolvem texto
# normal ao pipeline (continua funcionando com | Out-Null, variaveis, $LASTEXITCODE etc.). O texto do proprio
# SnowToolkit segue em UTF-8. Barras de progresso viram linhas "substituiveis" na interface (terminam em \r).
$global:SnowOem = [Text.Encoding]::UTF8
try { $global:SnowOem = [Text.Encoding]::GetEncoding([Globalization.CultureInfo]::CurrentCulture.TextInfo.OEMCodePage) } catch { }
$global:SnowUtf16 = [Text.Encoding]::Unicode

function global:ConvertTo-SnowArg([string]$a) {
    if ($a.Length -gt 0 -and $a -notmatch '[\s"]') { return $a }
    '"' + (($a -replace '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}

function global:Invoke-SnowNative([string]$Exe, [Text.Encoding]$Enc, [object[]]$NativeArgs) {
    $app = Get-Command $Exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $app) { Write-Host ('[XX] comando nao encontrado: ' + $Exe); $global:LASTEXITCODE = 9009; return }
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $app.Source
    $psi.Arguments = (@($NativeArgs | ForEach-Object { ConvertTo-SnowArg ([string]$_) }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.StandardOutputEncoding = $Enc
    $psi.StandardErrorEncoding = $Enc
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    try { [void]$p.Start() } catch { Write-Host ('[XX] ' + $_.Exception.Message); $global:LASTEXITCODE = 1; return }
    $errTask = $p.StandardError.ReadToEndAsync()
    $utf16 = ($Enc.CodePage -eq 1200)
    while ($null -ne ($line = $p.StandardOutput.ReadLine())) {
        $line = $line.Replace([string][char]0, '')
        if ($utf16 -and $line.Trim().Length -eq 0) { continue }
        if ($line -match '^\s*\[[=\s\-]*[\d.,]+%[=\s\-]*\]\s*$' -or $line -match '^\s*Verifica\w*\s+\d+\s*%') { $line + "`r" } else { $line }
    }
    $p.WaitForExit()
    $err = $errTask.Result
    if ($err) { foreach ($l in ($err -split "\r?\n")) { if ($l.Trim().Length -gt 0) { $l.Replace([string][char]0, '') } } }
    $global:LASTEXITCODE = $p.ExitCode
    $p.Dispose()
}

foreach ($n in 'dism', 'chkdsk', 'ipconfig', 'netsh', 'w32tm', 'gpupdate', 'winmgmt', 'powercfg', 'reg', 'schtasks', 'bcdedit',
              'net', 'ping', 'tracert', 'pathping', 'nslookup', 'netstat', 'arp', 'route', 'systeminfo', 'vssadmin', 'cipher',
              'defrag', 'wevtutil', 'fsutil', 'getmac', 'tasklist', 'taskkill', 'whoami', 'shutdown', 'certutil', 'driverquery',
              'pnputil', 'dsregcmd', 'manage-bde', 'gpresult', 'nbtstat', 'quser', 'cmdkey') {
    Set-Item -Path ('function:global:' + $n) -Value ([scriptblock]::Create("Invoke-SnowNative '$n.exe' `$global:SnowOem `$args"))
}
Set-Item -Path 'function:global:sfc' -Value ([scriptblock]::Create("Invoke-SnowNative 'sfc.exe' `$global:SnowUtf16 `$args"))
