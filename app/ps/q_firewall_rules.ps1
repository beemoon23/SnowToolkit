$list = Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True -ErrorAction SilentlyContinue | Where-Object { -not $_.Group -and $_.DisplayName -notlike '@*' } | ForEach-Object {
    $pf = $_ | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
    [pscustomobject]@{ name = $_.DisplayName; id = $_.Name; proto = [string]$pf.Protocol; port = [string]$pf.LocalPort; profile = [string]$_.Profile }
}
Out-Json $list
