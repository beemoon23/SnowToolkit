$st = $null
try {
    $m = Get-MpComputerStatus -ErrorAction Stop
    $st = [pscustomobject]@{ enabled = [bool]$m.AntivirusEnabled; realtime = [bool]$m.RealTimeProtectionEnabled; behavior = [bool]$m.BehaviorMonitorEnabled
        sigVersion = $m.AntivirusSignatureVersion; sigAge = $m.AntivirusSignatureAge
        sigUpdated = $(if ($m.AntivirusSignatureLastUpdated) { $m.AntivirusSignatureLastUpdated.ToString('dd/MM/yyyy HH:mm') } else { '' })
        lastQuick = $(if ($m.QuickScanEndTime) { $m.QuickScanEndTime.ToString('dd/MM/yyyy HH:mm') } else { '' })
        lastFull = $(if ($m.FullScanEndTime) { $m.FullScanEndTime.ToString('dd/MM/yyyy HH:mm') } else { '' }) }
} catch { }
$thr = @(Get-MpThreatDetection -ErrorAction SilentlyContinue | Select-Object -First 50 | ForEach-Object {
    [pscustomobject]@{ id = $_.ThreatID; when = $(if ($_.InitialDetectionTime) { $_.InitialDetectionTime.ToString('dd/MM/yyyy HH:mm') } else { '' })
        resources = (@($_.Resources) -join '; '); action = [string]$_.ActionSuccess }
})
$fw = @(Get-NetFirewallProfile -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ name = [string]$_.Name; enabled = [bool]$_.Enabled; inbound = [string]$_.DefaultInboundAction } })
Out-JsonObj ([pscustomobject]@{ status = $st; threats = $thr; firewall = $fw })
