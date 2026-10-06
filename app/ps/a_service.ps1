$n = Arg 'NAME'
$op = Arg 'OP'
try {
    Step ('Serviço ' + $n + ': ' + $op)
    switch ($op) {
        'start' { Start-Service -Name $n -ErrorAction Stop }
        'stop' { Stop-Service -Name $n -Force -ErrorAction Stop }
        'restart' { Restart-Service -Name $n -Force -ErrorAction Stop }
        'auto' { Set-Service -Name $n -StartupType Automatic -ErrorAction Stop }
        'manual' { Set-Service -Name $n -StartupType Manual -ErrorAction Stop }
        'disabled' { Set-Service -Name $n -StartupType Disabled -ErrorAction Stop }
        default { throw 'Operação desconhecida.' }
    }
    $s = Get-Service -Name $n
    Ok ($n + ' agora está ' + $s.Status + ' (inicialização: ' + $s.StartType + ')')
} catch { Fail $_.Exception.Message }
