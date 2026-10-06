$op = Arg 'OP'
$ids = @((Arg 'IDS') -split ',' | Where-Object { $_ })
try {
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Step 'Chocolatey não encontrado: instalando'
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
        if (-not (Get-Command choco -ErrorAction SilentlyContinue)) { throw 'Falha ao instalar o Chocolatey.' }
        Ok 'Chocolatey instalado.'
    }
    switch ($op) {
        'install' {
            if (-not $ids.Count) { throw 'Nenhum pacote informado.' }
            Step ('Instalando ' + $ids.Count + ' pacote(s) via Chocolatey')
            foreach ($id in $ids) {
                Write-Host ('   > ' + $id)
                choco install $id -y --no-progress 2>&1 | ForEach-Object { Write-Host ('   ' + $_) }
                if ($LASTEXITCODE -ne 0) { Warn ('Sem sucesso: ' + $id) }
            }
            Ok 'Concluído.'
        }
        'upgrade_all' { Step 'Atualizando todos os pacotes do Chocolatey'; choco upgrade all -y --no-progress 2>&1 | ForEach-Object { Write-Host ('   ' + $_) }; Ok 'Concluído.' }
        'uninstall' { foreach ($id in $ids) { Step ('Removendo ' + $id); choco uninstall $id -y 2>&1 | ForEach-Object { Write-Host ('   ' + $_) } }; Ok 'Concluído.' }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
