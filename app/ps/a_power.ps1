$op = Arg 'OP'
$d = [int](Arg 'DELAY' '0')
$msg = Arg 'MSG' 'Ação solicitada pela TI (SnowToolkit)'
switch ($op) {
    'restart' { Step ('Reiniciando em ' + $d + 's'); shutdown /r /t $d /c $msg }
    'shutdown' { Step ('Desligando em ' + $d + 's'); shutdown /s /t $d /c $msg }
    'firmware' { Step 'Reiniciando para a BIOS/UEFI'; shutdown /r /fw /t $d }
    'advanced' { Step 'Reiniciando para as opções avançadas'; shutdown /r /o /t $d }
    'logoff' { Step 'Encerrando a sessão'; shutdown /l }
    'cancel' { Step 'Cancelando desligamento agendado'; shutdown /a; Ok 'Cancelado (se havia algum agendado).' }
    default { Fail 'Operação desconhecida.' }
}
