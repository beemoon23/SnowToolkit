$h = Arg 'HOST'
$op = Arg 'OP'
$p = @{ ComputerName = $h; ErrorAction = 'Stop' }
if (Arg 'USER') { $p['Credential'] = New-Object System.Management.Automation.PSCredential((Arg 'USER'), (ConvertTo-SecureString (Arg 'PASS') -AsPlainText -Force)) }
try {
    switch ($op) {
        'ping' { Step ('ping ' + $h); ping -n 4 $h }
        'test' { Step ('Testando WinRM em ' + $h); Test-WSMan -ComputerName $h -ErrorAction Stop | Out-String | Write-Host; Ok 'WinRM respondeu.' }
        'rdp' { Step ('Abrindo Área de Trabalho Remota em ' + $h); Start-Process mstsc.exe -ArgumentList ('/v:' + $h); Ok 'Janela do RDP aberta.' }
        'restart' { Step ('Reiniciando ' + $h); Restart-Computer -Force @p; Ok 'Comando enviado.' }
        'shutdown' { Step ('Desligando ' + $h); Stop-Computer -Force @p; Ok 'Comando enviado.' }
        'gpupdate' { Step ('gpupdate em ' + $h); Invoke-Command @p -ScriptBlock { gpupdate /force 2>&1 } | Write-Host }
        'services' { Step ('Serviços parados (automáticos) em ' + $h); Invoke-Command @p -ScriptBlock { Get-Service | Where-Object { $_.StartType -eq 'Automatic' -and $_.Status -ne 'Running' } | Select-Object Name, Status | Format-Table -AutoSize | Out-String -Width 160 } | Write-Host }
        'processes' { Step ('Top 15 processos por memória em ' + $h); Invoke-Command @p -ScriptBlock { Get-Process | Sort-Object WS -Descending | Select-Object -First 15 Name, Id, @{n = 'MB'; e = { [math]::Round($_.WS / 1MB) } } | Format-Table -AutoSize | Out-String -Width 160 } | Write-Host }
        'command' {
            $c = Arg 'CMD'
            Step ('Executando em ' + $h + ': ' + $c)
            $sb = [scriptblock]::Create($c)
            Invoke-Command @p -ScriptBlock $sb 2>&1 | Out-String -Width 200 | Write-Host
            Ok 'Comando finalizado.'
        }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
