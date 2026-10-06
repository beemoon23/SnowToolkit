$list = Get-CimInstance Win32_StartupCommand | ForEach-Object {
    [pscustomobject]@{ name = $_.Name; command = $_.Command; location = $_.Location; user = $_.User }
}
Out-Json $list
