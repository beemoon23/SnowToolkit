$state = Arg 'STATE' 'Established'
$names = @{}
Get-Process | ForEach-Object { $names[[int]$_.Id] = $_.ProcessName }
$c = Get-NetTCPConnection -ErrorAction SilentlyContinue
if ($state -ne 'All') { $c = $c | Where-Object { [string]$_.State -eq $state } }
$list = $c | ForEach-Object {
    [pscustomobject]@{ proc = $names[[int]$_.OwningProcess]; pid = $_.OwningProcess; local = $_.LocalAddress; lport = $_.LocalPort
        remote = $_.RemoteAddress; rport = $_.RemotePort; state = [string]$_.State }
}
Out-Json $list
