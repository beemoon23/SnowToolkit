$base = Arg 'BASE'
if ($base -notmatch '^\d{1,3}\.\d{1,3}\.\d{1,3}$') { Out-JsonObj ([pscustomobject]@{ ok = $false; error = 'Base inválida. Use algo como 10.0.0'; hosts = @() }); return }
$ports = @()
$pa = Arg 'PORTS' ''
if ($pa) { $ports = @($pa -split ',' | Where-Object { $_ -match '^\d+$' } | ForEach-Object { [int]$_ }) }
$pings = @{}
foreach ($i in 1..254) {
    $ip = $base + '.' + $i
    $p = New-Object System.Net.NetworkInformation.Ping
    $pings[$ip] = $p.SendPingAsync($ip, 900)
}
try { [void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($pings.Values), 20000) } catch { }
$alive = @($pings.Keys | Where-Object { $pings[$_].Status -eq 'RanToCompletion' -and $pings[$_].Result.Status -eq 'Success' } | Sort-Object { [version]$_ })
$dns = @{}
foreach ($ip in $alive) { $dns[$ip] = [System.Net.Dns]::GetHostEntryAsync($ip) }
try { [void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($dns.Values), 4000) } catch { }
$tcp = @{}
if ($ports.Count -gt 0) {
    foreach ($ip in $alive) {
        foreach ($pt in $ports) {
            $c = New-Object System.Net.Sockets.TcpClient
            $tcp[$ip + ':' + $pt] = [pscustomobject]@{ client = $c; task = $c.ConnectAsync($ip, $pt); ip = $ip; port = $pt }
        }
    }
    try { [void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($tcp.Values | ForEach-Object { $_.task }), 2000) } catch { }
}
$mac = @{}
Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.LinkLayerAddress -and $_.LinkLayerAddress -ne '00-00-00-00-00-00' } | ForEach-Object { $mac[$_.IPAddress] = $_.LinkLayerAddress }
$hosts = foreach ($ip in $alive) {
    $name = ''
    if ($dns[$ip].Status -eq 'RanToCompletion') { $name = $dns[$ip].Result.HostName }
    $open = @()
    foreach ($pt in $ports) { $t = $tcp[$ip + ':' + $pt]; if ($t -and $t.task.Status -eq 'RanToCompletion' -and $t.client.Connected) { $open += $pt } }
    [pscustomobject]@{ ip = $ip; name = $name; mac = $mac[$ip]; ms = $pings[$ip].Result.RoundtripTime; ports = ($open -join ', ') }
}
foreach ($t in $tcp.Values) { try { $t.client.Close() } catch { } }
Out-JsonObj ([pscustomobject]@{ ok = $true; hosts = @($hosts) })
