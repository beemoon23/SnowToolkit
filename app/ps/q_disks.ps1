$vol = @(Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object {
    [pscustomobject]@{ letter = [string]$_.DriveLetter; label = $_.FileSystemLabel; fs = $_.FileSystem; type = [string]$_.DriveType
        sizeGB = [math]::Round($_.Size / 1GB, 1); freeGB = [math]::Round($_.SizeRemaining / 1GB, 1); health = [string]$_.HealthStatus }
})
$phys = @(Get-PhysicalDisk | ForEach-Object {
    $r = $null
    try { $r = $_ | Get-StorageReliabilityCounter -ErrorAction Stop } catch { }
    [pscustomobject]@{ name = $_.FriendlyName; media = [string]$_.MediaType; bus = [string]$_.BusType; sizeGB = [math]::Round($_.Size / 1GB)
        health = [string]$_.HealthStatus; status = [string]$_.OperationalStatus
        temp = $(if ($r) { $r.Temperature } else { $null }); wear = $(if ($r) { $r.Wear } else { $null })
        hours = $(if ($r) { $r.PowerOnHours } else { $null }); readErr = $(if ($r) { $r.ReadErrorsTotal } else { $null })
        writeErr = $(if ($r) { $r.WriteErrorsTotal } else { $null }) }
})
Out-JsonObj ([pscustomobject]@{ volumes = $vol; physical = $phys })
