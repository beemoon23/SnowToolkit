Step 'Preparando o módulo PSWindowsUpdate'
try {
    if (-not (Get-Module -ListAvailable PSWindowsUpdate)) {
        Install-PackageProvider -Name NuGet -Force | Out-Null
        Install-Module PSWindowsUpdate -Force
    }
    Import-Module PSWindowsUpdate
    Step 'Procurando atualizações'
    $list = Get-WindowsUpdate
    if (-not $list) { Ok 'O Windows está atualizado.'; return }
    $list | ForEach-Object { Write-Host ('   ' + $_.KB + '  ' + $_.Title) }
    Step 'Instalando (pode demorar e pedir reinício)'
    Install-WindowsUpdate -AcceptAll -IgnoreReboot | Out-String -Width 200 | Write-Host
    Ok 'Atualizações processadas. Reinicie o computador se solicitado.'
} catch { Fail $_.Exception.Message }
