$shares = @(Get-SmbShare -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ name = $_.Name; path = $_.Path; desc = $_.Description; special = [bool]$_.Special } })
$sess = @(Get-SmbSession -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ client = $_.ClientComputerName; user = $_.ClientUserName; opens = $_.NumOpens; secs = $_.SecondsExists } })
$open = @(Get-SmbOpenFile -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ client = $_.ClientComputerName; user = $_.ClientUserName; path = $_.Path } })
Out-JsonObj ([pscustomobject]@{ shares = $shares; sessions = $sess; open = $open })
