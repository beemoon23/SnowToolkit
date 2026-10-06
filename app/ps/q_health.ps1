$pending = $false
$reasons = @()
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') { $pending = $true; $reasons += 'Componentes do Windows' }
if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') { $pending = $true; $reasons += 'Windows Update' }
if ($null -ne (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations) { $pending = $true; $reasons += 'Arquivos pendentes de renomear' }

$def = $null
try {
    $m = Get-MpComputerStatus -ErrorAction Stop
    $def = [pscustomobject]@{ enabled = [bool]$m.AntivirusEnabled; realtime = [bool]$m.RealTimeProtectionEnabled; sigAgeDays = $m.AntivirusSignatureAge; lastQuick = $(if ($m.QuickScanEndTime) { $m.QuickScanEndTime.ToString('dd/MM/yyyy HH:mm') } else { '' }) }
} catch { }

$fw = @(Get-NetFirewallProfile -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; enabled = [bool]$_.Enabled } })

$lastUpd = $null
try {
    $h = Get-HotFix -ErrorAction Stop | Where-Object InstalledOn | Sort-Object InstalledOn -Descending | Select-Object -First 1
    if ($h) { $lastUpd = [math]::Round(((Get-Date) - $h.InstalledOn).TotalDays) }
} catch { }

$disks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ name = $_.FriendlyName; health = [string]$_.HealthStatus } })
$vols = @(Get-Volume -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter -and $_.Size -gt 0 } | ForEach-Object {
    [pscustomobject]@{ letter = [string]$_.DriveLetter; freePct = [math]::Round(($_.SizeRemaining / $_.Size) * 100); freeGB = [math]::Round($_.SizeRemaining / 1GB, 1) }
})

$failedSvc = @(Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Where-Object { $_.StartMode -eq 'Auto' -and $_.State -ne 'Running' -and $_.ExitCode -ne 0 -and $_.ExitCode -ne 1077 } | ForEach-Object { $_.Name })

$smb1 = $null
try { $smb1 = [bool](Get-SmbServerConfiguration -ErrorAction Stop).EnableSMB1Protocol } catch { }
$rdp = $null
try { $rdp = ((Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections -ErrorAction Stop).fDenyTSConnections -eq 0) } catch { }

$bl = @()
try { $bl = @(Get-BitLockerVolume -ErrorAction Stop | ForEach-Object { [pscustomobject]@{ mount = $_.MountPoint; status = [string]$_.ProtectionStatus } }) } catch { }

$admins = 0
try { $admins = @(Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop).Count } catch { }

$up = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
Out-JsonObj ([pscustomobject]@{
    pendingReboot = $pending; pendingReasons = $reasons; defender = $def; firewall = $fw
    lastUpdateDays = $lastUpd; disks = $disks; volumes = $vols; failedServices = $failedSvc
    smb1 = $smb1; rdp = $rdp; bitlocker = $bl; admins = $admins; uptimeDays = [math]::Round($up.TotalDays, 1)
})
