$op = Arg 'OP'
$n = Arg 'NAME'
try {
    switch ($op) {
        'clear' { Step 'Limpando a fila e reiniciando o spooler'; Stop-Service Spooler -Force; Remove-Item "$env:windir\System32\spool\PRINTERS\*" -Force -ErrorAction SilentlyContinue; Start-Service Spooler; Ok 'Fila limpa.' }
        'remove' { Step ('Removendo ' + $n); Remove-Printer -Name $n -ErrorAction Stop; Ok 'Removida.' }
        'default' { Step ('Definindo ' + $n + ' como padrão'); (New-Object -ComObject WScript.Network).SetDefaultPrinter($n); Ok 'Definida como padrão.' }
        'testpage' { Step ('Página de teste em ' + $n); rundll32 printui.dll,PrintUIEntry /k /n $n; Ok 'Enviada.' }
        'add' {
            $ip = Arg 'IP'; $drv = Arg 'DRIVER'
            Step ('Adicionando ' + $n + ' em ' + $ip)
            if (-not (Get-PrinterPort -Name ('IP_' + $ip) -ErrorAction SilentlyContinue)) { Add-PrinterPort -Name ('IP_' + $ip) -PrinterHostAddress $ip -ErrorAction Stop }
            Add-Printer -Name $n -DriverName $drv -PortName ('IP_' + $ip) -ErrorAction Stop
            Ok 'Impressora adicionada.'
        }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
