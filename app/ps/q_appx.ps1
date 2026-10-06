$list = Get-AppxPackage -AllUsers | Where-Object { -not $_.IsFramework -and -not $_.NonRemovable } | ForEach-Object {
    [pscustomobject]@{ name = $_.Name; version = [string]$_.Version; publisher = ($_.Publisher -replace '^CN=([^,]+).*$', '$1'); full = $_.PackageFullName }
}
Out-Json ($list | Sort-Object name)
