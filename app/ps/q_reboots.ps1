$kinds = @{ 41 = 'Reinício inesperado (Kernel-Power)'; 1074 = 'Desligamento/reinício solicitado'; 6005 = 'Serviço de log iniciado (boot)'; 6006 = 'Desligamento limpo'; 6008 = 'Desligamento inesperado'; 1076 = 'Motivo registrado pelo administrador' }
$ev = Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 41, 1074, 1076, 6005, 6006, 6008; StartTime = (Get-Date).AddDays(30 * -1) } -MaxEvents 150 -ErrorAction SilentlyContinue
$list = $ev | ForEach-Object {
    $m = ''
    if ($_.Message) { $m = ($_.Message -split "`n")[0].Trim() }
    if ($_.Id -eq 1074 -and $_.Properties.Count -ge 7) { $m = ('Processo: ' + $_.Properties[0].Value + ' | Motivo: ' + $_.Properties[2].Value + ' | Ação: ' + $_.Properties[4].Value + ' | Usuário: ' + $_.Properties[6].Value) }
    [pscustomobject]@{ time = $_.TimeCreated.ToString('dd/MM/yyyy HH:mm:ss'); id = $_.Id; kind = $kinds[[int]$_.Id]; message = $m }
}
Out-Json $list
