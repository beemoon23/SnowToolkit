$keys = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
$seen = @{}
$list = foreach ($p in (Get-ItemProperty $keys -ErrorAction SilentlyContinue)) {
    if (-not $p.DisplayName -or $p.SystemComponent -eq 1 -or $p.ParentKeyName) { continue }
    $k = $p.DisplayName + '|' + $p.DisplayVersion
    if ($seen.ContainsKey($k)) { continue }
    $seen[$k] = 1
    [pscustomobject]@{ name = $p.DisplayName; version = $p.DisplayVersion; publisher = $p.Publisher; date = $p.InstallDate
        sizeMB = $(if ($p.EstimatedSize) { [math]::Round($p.EstimatedSize / 1024, 1) } else { $null })
        uninstall = $p.UninstallString; quiet = $p.QuietUninstallString }
}
Out-Json $list
