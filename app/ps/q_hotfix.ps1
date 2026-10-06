$list = Get-HotFix -ErrorAction SilentlyContinue | Sort-Object InstalledOn -Descending | ForEach-Object {
    [pscustomobject]@{ id = $_.HotFixID; desc = $_.Description; date = $(if ($_.InstalledOn) { $_.InstalledOn.ToString('dd/MM/yyyy') } else { '' }); by = $_.InstalledBy }
}
Out-Json $list
