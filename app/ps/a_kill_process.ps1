$procId = Arg 'PID'
$name = Arg 'NAME'
try {
    if ($procId) {
        $p = Get-Process -Id ([int]$procId) -ErrorAction Stop
        Step ('Encerrando ' + $p.ProcessName + ' (PID ' + $procId + ')')
        Stop-Process -Id ([int]$procId) -Force -ErrorAction Stop
        Ok 'Processo encerrado.'
    } elseif ($name) {
        Step ('Encerrando todos os processos "' + $name + '"')
        $n = @(Get-Process -Name $name -ErrorAction Stop).Count
        Stop-Process -Name $name -Force -ErrorAction Stop
        Ok ($n.ToString() + ' processo(s) encerrado(s).')
    } else { Fail 'Nenhum processo informado.' }
} catch { Fail $_.Exception.Message }
