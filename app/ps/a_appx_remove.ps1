$full = @((Arg 'FULL') -split '\|' | Where-Object { $_ })
foreach ($f in $full) {
    Step ('Removendo ' + $f)
    try {
        Remove-AppxPackage -Package $f -AllUsers -ErrorAction Stop
        $short = ($f -split '_')[0]
        Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq $short } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Out-Null
        Ok 'Removido.'
    } catch { Fail $_.Exception.Message }
}
