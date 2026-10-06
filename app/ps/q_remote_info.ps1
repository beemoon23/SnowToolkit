$h = Arg 'HOST'
$p = @{ ComputerName = $h; ErrorAction = 'Stop' }
if (Arg 'USER') { $p['Credential'] = New-Object System.Management.Automation.PSCredential((Arg 'USER'), (ConvertTo-SecureString (Arg 'PASS') -AsPlainText -Force)) }
try {
    $r = Invoke-Command @p -ScriptBlock {
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        $up = (Get-Date) - $os.LastBootUpTime
        $c = Get-Volume -DriveLetter C -ErrorAction SilentlyContinue
        [pscustomobject]@{ host = $env:COMPUTERNAME; user = (@(query user 2>$null | Select-Object -Skip 1) -join ' | '); os = $os.Caption; build = $os.BuildNumber; model = $cs.Model
            ramGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1); freeGB = $(if ($c) { [math]::Round($c.SizeRemaining / 1GB, 1) } else { $null })
            uptime = ('{0}d {1}h {2}min' -f $up.Days, $up.Hours, $up.Minutes); ips = (@(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } | ForEach-Object { $_.IPAddress }) -join ', ') }
    }
    Out-JsonObj ([pscustomobject]@{ ok = $true; info = $r })
} catch {
    Out-JsonObj ([pscustomobject]@{ ok = $false; error = $_.Exception.Message })
}
