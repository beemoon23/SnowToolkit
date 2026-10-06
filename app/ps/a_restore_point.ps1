Step 'Criando ponto de restauração'
$k = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore'
try {
    Enable-ComputerRestore -Drive ($env:SystemDrive + '\')
    Set-Reg $k 'SystemRestorePointCreationFrequency' 0
    Checkpoint-Computer -Description (Arg 'NAME' 'SnowToolkit') -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
    Ok 'Ponto de restauração criado.'
} catch { Fail $_.Exception.Message } finally { Remove-Reg $k 'SystemRestorePointCreationFrequency' }
