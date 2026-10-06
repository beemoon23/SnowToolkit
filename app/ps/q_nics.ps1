$cfg = @{}
Get-NetIPConfiguration -All -ErrorAction SilentlyContinue | ForEach-Object { $cfg[[int]$_.InterfaceIndex] = $_ }
$dhcp = @{}
Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue | ForEach-Object { $dhcp[[int]$_.InterfaceIndex] = [string]$_.Dhcp }
$list = Get-NetAdapter -ErrorAction SilentlyContinue | ForEach-Object {
    $c = $cfg[[int]$_.ifIndex]
    $ip = ''; $gw = ''; $dns = ''
    if ($c) {
        $ip = (@($c.IPv4Address | ForEach-Object { $_.IPAddress }) -join ', ')
        if ($c.IPv4DefaultGateway) { $gw = $c.IPv4DefaultGateway.NextHop }
        $dns = (@($c.DNSServer | Where-Object { $_.AddressFamily -eq 2 } | ForEach-Object { $_.ServerAddresses }) -join ', ')
    }
    [pscustomobject]@{ name = $_.Name; desc = $_.InterfaceDescription; status = [string]$_.Status; speed = $_.LinkSpeed; mac = $_.MacAddress
        media = [string]$_.PhysicalMediaType; ip = $ip; gw = $gw; dns = $dns; dhcp = $dhcp[[int]$_.ifIndex]; index = $_.ifIndex }
}
Out-Json $list
