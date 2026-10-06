$op = Arg 'OP'
$ids = @((Arg 'IDS') -split ',' | Where-Object { $_ })
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Fail 'winget não encontrado. Instale o Instalador de Aplicativo pela Microsoft Store.'; return }
$common = @('--silent', '--accept-package-agreements', '--accept-source-agreements')
switch ($op) {
    'install' {
        $falhas = @()
        foreach ($id in $ids) {
            Step ('Instalando ' + $id)
            winget install --id $id -e @common
            if ($LASTEXITCODE -ne 0) { $falhas += $id; Warn ('código de saída ' + $LASTEXITCODE) } else { Ok $id }
        }
        if ($falhas.Count) { Warn ('Sem sucesso: ' + ($falhas -join ', ') + ' (já instalado, ID mudou ou falha).') } else { Ok 'Todos os pacotes foram processados.' }
    }
    'upgrade' {
        foreach ($id in $ids) { Step ('Atualizando ' + $id); winget upgrade --id $id -e @common; if ($LASTEXITCODE -eq 0) { Ok $id } else { Warn ('código ' + $LASTEXITCODE) } }
    }
    'upgrade_all' { Step 'Atualizando todos os programas'; winget upgrade --all --include-unknown @common; Ok 'Processo concluído.' }
    'uninstall' {
        foreach ($id in $ids) { Step ('Desinstalando ' + $id); winget uninstall --id $id -e --silent --accept-source-agreements; if ($LASTEXITCODE -eq 0) { Ok $id } else { Warn ('código ' + $LASTEXITCODE) } }
    }
    default { Fail 'Operação desconhecida.' }
}
