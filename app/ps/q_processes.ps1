$list = Get-Process | ForEach-Object {
    $p = $null
    try { $p = $_.Path } catch { }
    [pscustomobject]@{ pid = $_.Id; name = $_.ProcessName; cpu = [math]::Round([double]$_.CPU, 1); memMB = [math]::Round($_.WorkingSet64 / 1MB, 1)
        threads = $_.Threads.Count; path = $p; title = $_.MainWindowTitle }
}
Out-Json $list
