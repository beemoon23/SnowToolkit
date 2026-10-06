$op = Arg 'OP'
$n = Arg 'NAME'
try {
    switch ($op) {
        'create' {
            Step ('Criando usuário ' + $n)
            $pw = ConvertTo-SecureString (Arg 'PASS') -AsPlainText -Force
            New-LocalUser -Name $n -Password $pw -FullName (Arg 'FULL' $n) -ErrorAction Stop | Out-Null
            Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $n
            if ((Arg 'ADMIN' '0') -eq '1') { Add-LocalGroupMember -SID 'S-1-5-32-544' -Member $n; Write-Host '   adicionado ao grupo Administradores' }
            Ok 'Usuário criado.'
        }
        'resetpw' { Step ('Redefinindo a senha de ' + $n); Set-LocalUser -Name $n -Password (ConvertTo-SecureString (Arg 'PASS') -AsPlainText -Force) -ErrorAction Stop; Ok 'Senha alterada.' }
        'enable' { Step ('Ativando ' + $n); Enable-LocalUser -Name $n -ErrorAction Stop; Ok 'Ativado.' }
        'disable' { Step ('Desativando ' + $n); Disable-LocalUser -Name $n -ErrorAction Stop; Ok 'Desativado.' }
        'admin' { Step ('Tornando ' + $n + ' administrador'); Add-LocalGroupMember -SID 'S-1-5-32-544' -Member $n -ErrorAction Stop; Ok 'Feito.' }
        'unadmin' { Step ('Removendo ' + $n + ' dos administradores'); Remove-LocalGroupMember -SID 'S-1-5-32-544' -Member $n -ErrorAction Stop; Ok 'Feito.' }
        'delete' { Step ('Excluindo ' + $n); Remove-LocalUser -Name $n -ErrorAction Stop; Ok 'Usuário excluído (a pasta do perfil não é apagada).' }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
