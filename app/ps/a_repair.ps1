$what = Arg 'WHAT'
function Do-Dism { Step 'DISM CheckHealth'; DISM /Online /Cleanup-Image /CheckHealth; Step 'DISM ScanHealth'; DISM /Online /Cleanup-Image /ScanHealth; Step 'DISM RestoreHealth (pode demorar)'; DISM /Online /Cleanup-Image /RestoreHealth }
switch ($what) {
    'dism' { Do-Dism }
    'sfc' { Step 'SFC /scannow'; sfc /scannow }
    'full' { Do-Dism; Step 'SFC /scannow'; sfc /scannow; Ok 'Reparo completo concluído. Detalhes do SFC em %windir%\Logs\CBS\CBS.log' }
    'chkdsk_scan' { Step ('CHKDSK ' + $env:SystemDrive + ' /scan (somente leitura)'); chkdsk $env:SystemDrive /scan }
    'chkdsk_fix' { Step 'Agendando CHKDSK /f /r para o próximo boot'; cmd /c ('echo Y| chkdsk ' + $env:SystemDrive + ' /f /r'); Warn 'Reinicie o computador para executar a verificação.' }
    'wureset' {
        Step 'Resetando componentes do Windows Update'
        $svcs = 'wuauserv', 'bits', 'cryptsvc', 'msiserver'
        foreach ($s in $svcs) { Stop-Service $s -Force -ErrorAction SilentlyContinue }
        $stamp = Get-Date -Format 'yyyyMMddHHmm'
        foreach ($p in "$env:windir\SoftwareDistribution", "$env:windir\System32\catroot2") {
            if (Test-Path $p) { Rename-Item $p ((Split-Path $p -Leaf) + '.old.' + $stamp) -ErrorAction SilentlyContinue }
        }
        foreach ($s in $svcs) { Start-Service $s -ErrorAction SilentlyContinue }
        Ok 'Pronto. Procure atualizações de novo.'
    }
    'storereset' {
        Step 'Re-registrando apps da Microsoft Store'
        Get-AppxPackage -AllUsers | ForEach-Object { Add-AppxPackage -DisableDevelopmentMode -Register ($_.InstallLocation + '\AppXManifest.xml') -ErrorAction SilentlyContinue }
        Ok 'Concluído.'
    }
    'netreset' { Step 'Reset da pilha de rede'; netsh winsock reset; netsh int ip reset; ipconfig /flushdns; Warn 'Reinicie o computador para concluir.' }
    'dnsflush' { Step 'Limpando cache DNS'; ipconfig /flushdns; Ok 'Cache DNS limpo.' }
    'iprenew' { Step 'Renovando IP'; ipconfig /release | Out-Null; ipconfig /renew; Ok 'IP renovado.' }
    'spooler' {
        Step 'Limpando fila de impressão e reiniciando o spooler'
        Stop-Service Spooler -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:windir\System32\spool\PRINTERS\*" -Force -ErrorAction SilentlyContinue
        Start-Service Spooler
        Ok 'Fila limpa.'
    }
    'icons' {
        Step 'Reconstruindo o cache de ícones'
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\IconCache.db" -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache*" -Force -ErrorAction SilentlyContinue
        Start-Process explorer.exe
        Ok 'Cache de ícones recriado.'
    }
    'explorer' { Step 'Reiniciando o Explorer'; Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; Start-Sleep 1; Start-Process explorer.exe; Ok 'Explorer reiniciado.' }
    'timesync' { Step 'Sincronizando a hora'; Start-Service w32time -ErrorAction SilentlyContinue; w32tm /resync; Ok 'Concluído.' }
    'wmi' { Step 'Verificando o repositório WMI'; winmgmt /verifyrepository; Warn 'Se aparecer "inconsistente", rode: winmgmt /salvagerepository' }
    'components' { Step 'Limpeza de componentes (WinSxS)'; DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase; Ok 'Concluído.' }
    'gpupdate' { Step 'Atualizando políticas de grupo'; gpupdate /force }
    default { Fail 'Operação desconhecida.' }
}
