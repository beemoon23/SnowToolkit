$fmt = Arg 'FORMAT' 'html'
$desk = [Environment]::GetFolderPath('Desktop')
if (-not $desk -or -not (Test-Path $desk)) { $desk = Join-Path $env:USERPROFILE 'Desktop' }
Step 'Coletando dados do computador'
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = (@(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join '; ')
$resumo = [pscustomobject]@{
    Computador = $env:COMPUTERNAME; Usuario = $env:USERNAME; Fabricante = $cs.Manufacturer; Modelo = $cs.Model; Serial = $bios.SerialNumber
    Windows = $os.Caption; Build = $os.BuildNumber; CPU = ($cpu.Name + '').Trim(); 'RAM (GB)' = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1); Video = $gpu
    'Ultimo boot' = $os.LastBootUpTime.ToString('dd/MM/yyyy HH:mm'); Dominio = $cs.Domain
}
Write-Host '   resumo ok'
$discos = Get-Volume | Where-Object { $_.DriveLetter -and $_.Size -gt 0 } | Select-Object @{n = 'Unidade'; e = { $_.DriveLetter + ':' } }, FileSystemLabel, @{n = 'Total (GB)'; e = { [math]::Round($_.Size / 1GB, 1) } }, @{n = 'Livre (GB)'; e = { [math]::Round($_.SizeRemaining / 1GB, 1) } }
$rede = Get-NetAdapter | Where-Object Status -eq 'Up' | ForEach-Object {
    $ip = (Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    [pscustomobject]@{ Placa = $_.Name; IPv4 = $ip; MAC = $_.MacAddress; Velocidade = $_.LinkSpeed }
}
Write-Host '   discos e rede ok'
$keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
$progs = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object DisplayName | Select-Object @{n = 'Programa'; e = { $_.DisplayName } }, @{n = 'Versao'; e = { $_.DisplayVersion } }, @{n = 'Fabricante'; e = { $_.Publisher } } | Sort-Object Programa
Write-Host ('   ' + @($progs).Count + ' programas')
$upd = Get-HotFix -ErrorAction SilentlyContinue | Sort-Object InstalledOn -Descending | Select-Object -First 15 HotFixID, Description, InstalledOn
$stamp = Get-Date -Format 'yyyyMMdd'
if ($fmt -eq 'csv' -or $fmt -eq 'both') {
    $f = Join-Path $desk ('inventario_' + $env:COMPUTERNAME + '_' + $stamp + '.csv')
    $resumo | Export-Csv $f -NoTypeInformation -Encoding UTF8
    Ok ('CSV salvo em ' + $f)
}
if ($fmt -eq 'html' -or $fmt -eq 'both') {
    $css = '<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0f0b1f;color:#e8e4f8;margin:0;padding:32px}h1{color:#8fe0ff;margin:0 0 4px}.s{color:#9f96c6;margin-bottom:24px}h2{color:#b9a9ff;border-bottom:1px solid #2f2752;padding-bottom:6px;margin-top:32px}table{border-collapse:collapse;width:100%;background:#171229;border-radius:8px;overflow:hidden}th{background:#3b2f7a;color:#fff;text-align:left;padding:8px 12px}td{padding:7px 12px;border-top:1px solid #2f2752}tr:hover td{background:#1f1838}</style>'
    $html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Inventário ' + $env:COMPUTERNAME + '</title>' + $css + '</head><body>'
    $html += '<h1>Inventário - ' + $env:COMPUTERNAME + '</h1><div class="s">Gerado em ' + (Get-Date -Format 'dd/MM/yyyy HH:mm') + ' pelo SnowToolkit</div>'
    $html += '<h2>Resumo</h2>' + ($resumo | ConvertTo-Html -Fragment) + '<h2>Discos</h2>' + ($discos | ConvertTo-Html -Fragment) + '<h2>Rede</h2>' + ($rede | ConvertTo-Html -Fragment)
    $html += '<h2>Últimas atualizações</h2>' + ($upd | ConvertTo-Html -Fragment) + '<h2>Programas instalados</h2>' + ($progs | ConvertTo-Html -Fragment) + '</body></html>'
    $f = Join-Path $desk ('inventario_' + $env:COMPUTERNAME + '_' + $stamp + '.html')
    [IO.File]::WriteAllText($f, $html, (New-Object Text.UTF8Encoding($true)))
    Ok ('HTML salvo em ' + $f)
    Start-Process $f
}
