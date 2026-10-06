$op = Arg 'OP'
try {
    switch ($op) {
        'open' {
            $port = [int](Arg 'PORT'); $proto = Arg 'PROTO' 'TCP'; $name = Arg 'NAME' ('SnowToolkit - ' + $proto + ' ' + $port)
            Step ('Liberando ' + $proto + ' ' + $port + ' de entrada')
            New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol $proto -LocalPort $port -Action Allow -ErrorAction Stop | Out-Null
            Ok 'Regra criada.'
        }
        'remove' { Step ('Removendo regra ' + (Arg 'ID')); Remove-NetFirewallRule -Name (Arg 'ID') -ErrorAction Stop; Ok 'Regra removida.' }
        'enable' { Step 'Ligando o firewall em todos os perfis'; Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled True; Ok 'Firewall ligado.' }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
