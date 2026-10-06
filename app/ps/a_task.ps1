$n = Arg 'NAME'
$path = Arg 'PATH' '\'
$op = Arg 'OP'
try {
    Step ('Tarefa ' + $path + $n + ': ' + $op)
    switch ($op) {
        'run' { Start-ScheduledTask -TaskName $n -TaskPath $path -ErrorAction Stop }
        'enable' { Enable-ScheduledTask -TaskName $n -TaskPath $path -ErrorAction Stop | Out-Null }
        'disable' { Disable-ScheduledTask -TaskName $n -TaskPath $path -ErrorAction Stop | Out-Null }
        'delete' { Unregister-ScheduledTask -TaskName $n -TaskPath $path -Confirm:$false -ErrorAction Stop }
        default { throw 'Operação desconhecida.' }
    }
    Ok 'Concluído.'
} catch { Fail $_.Exception.Message }
