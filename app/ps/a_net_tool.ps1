$tool = Arg 'TOOL'
$h = Arg 'HOST'
switch ($tool) {
    'ping' { Step ('ping ' + $h); ping -n ([int](Arg 'COUNT' '4')) $h }
    'tracert' { Step ('tracert ' + $h); tracert -d -w 1500 $h }
    'pathping' { Step ('pathping ' + $h); pathping -q 10 -p 100 $h }
    'nslookup' { Step ('nslookup ' + $h); nslookup $h }
    'dns' {
        Step ('Resolve-DnsName ' + $h)
        Resolve-DnsName $h -ErrorAction SilentlyContinue | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
    }
    'port' {
        $port = [int](Arg 'PORT')
        Step ('Testando ' + $h + ':' + $port)
        $r = Test-NetConnection -ComputerName $h -Port $port -WarningAction SilentlyContinue
        if ($r.TcpTestSucceeded) { Ok ($h + ':' + $port + ' ABERTA (' + $r.RemoteAddress + ')') } else { Fail ($h + ':' + $port + ' fechada ou filtrada') }
    }
    'arp' { Step 'Tabela ARP'; arp -a }
    'route' { Step 'Tabela de rotas'; route print }
    'ipconfig' { Step 'ipconfig /all'; ipconfig /all }
    default { Fail 'Ferramenta desconhecida.' }
}
