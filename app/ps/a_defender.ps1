$op = Arg 'OP'
try {
    switch ($op) {
        'update' { Step 'Atualizando definições'; Update-MpSignature -ErrorAction Stop; Ok 'Definições atualizadas.' }
        'quick' { Step 'Varredura rápida'; Start-MpScan -ScanType QuickScan -ErrorAction Stop; Ok 'Varredura rápida concluída.' }
        'full' { Step 'Varredura completa (pode levar horas)'; Start-MpScan -ScanType FullScan -ErrorAction Stop; Ok 'Varredura completa concluída.' }
        default { Fail 'Operação desconhecida.' }
    }
} catch { Fail $_.Exception.Message }
