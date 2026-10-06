$list = Get-CimInstance Win32_Service | ForEach-Object {
    [pscustomobject]@{ name = $_.Name; display = $_.DisplayName; state = $_.State; start = $_.StartMode; account = $_.StartName; pid = $_.ProcessId; path = $_.PathName }
}
Out-Json $list
