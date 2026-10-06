$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$bios = Get-CimInstance Win32_BIOS
$board = Get-CimInstance Win32_BaseBoard
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name + ' (driver ' + $_.DriverVersion + ')' })
$act = 'Desconhecido'
try {
    $lic = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL AND Name LIKE 'Windows%'" | Select-Object -First 1
    if ($lic.LicenseStatus -eq 1) { $act = 'Ativado' } else { $act = 'Não ativado' }
} catch { }
$sb = 'N/D'
try { if (Confirm-SecureBootUEFI) { $sb = 'Ativado' } else { $sb = 'Desativado' } } catch { $sb = 'Não suportado (BIOS legada)' }
$tpm = 'N/D'
try { $t = Get-Tpm; if ($t.TpmPresent) { if ($t.TpmReady) { $tpm = 'Presente e pronto' } else { $tpm = 'Presente' } } else { $tpm = 'Ausente' } } catch { }
$ram = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object { [pscustomobject]@{ slot = $_.BankLabel; gb = [math]::Round($_.Capacity / 1GB, 1); mhz = $_.Speed; maker = $_.Manufacturer; part = ($_.PartNumber + '').Trim() } })
$ips = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Address } | ForEach-Object {
    $gw = ''
    if ($_.IPv4DefaultGateway) { $gw = $_.IPv4DefaultGateway.NextHop }
    [pscustomobject]@{ nic = $_.InterfaceAlias; ip = $_.IPv4Address.IPAddress; gw = $gw }
})
$up = (Get-Date) - $os.LastBootUpTime
$obj = [pscustomobject]@{
    host = $env:COMPUTERNAME
    user = $env:USERDOMAIN + '\' + $env:USERNAME
    domain = $cs.Domain
    partOfDomain = [bool]$cs.PartOfDomain
    maker = $cs.Manufacturer
    model = $cs.Model
    serial = $bios.SerialNumber
    biosVersion = $bios.SMBIOSBIOSVersion
    biosDate = $(if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString('dd/MM/yyyy') } else { '' })
    board = ($board.Manufacturer + ' ' + $board.Product).Trim()
    os = $os.Caption
    build = $os.BuildNumber
    arch = $os.OSArchitecture
    installDate = $os.InstallDate.ToString('dd/MM/yyyy')
    uptime = ('{0}d {1}h {2}min' -f $up.Days, $up.Hours, $up.Minutes)
    uptimeDays = [math]::Round($up.TotalDays, 1)
    cpu = ($cpu.Name + '').Trim()
    cores = $cpu.NumberOfCores
    threads = $cpu.NumberOfLogicalProcessors
    ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
    ram = $ram
    gpu = $gpu
    activation = $act
    secureBoot = $sb
    tpm = $tpm
    net = $ips
}
Out-JsonObj $obj
