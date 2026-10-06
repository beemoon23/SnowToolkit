$log = Arg 'LOG' 'System'
if ($log -notmatch '^[\w\-/ ]+$') { Out-Json @(); return }
$levels = @((Arg 'LEVEL' '1,2') -split ',' | Where-Object { $_ } | ForEach-Object { [int]$_ })
$hours = [int](Arg 'HOURS' '24')
$max = [int](Arg 'MAX' '300')
$ids = Arg 'IDS' ''
$provider = Arg 'PROVIDER' ''
$f = @{ LogName = $log; StartTime = (Get-Date).AddHours(-$hours) }
if ($levels.Count -gt 0 -and $levels[0] -gt 0) { $f['Level'] = $levels }
if ($ids) { $f['Id'] = @($ids -split ',' | Where-Object { $_ } | ForEach-Object { [int]$_ }) }
if ($provider) { $f['ProviderName'] = $provider }
$list = Get-WinEvent -FilterHashtable $f -MaxEvents $max -ErrorAction SilentlyContinue | ForEach-Object {
    $msg = ''
    if ($_.Message) { $msg = $_.Message.Trim() }
    if ($msg.Length -gt 700) { $msg = $msg.Substring(0, 700) + '...' }
    [pscustomobject]@{ time = $_.TimeCreated.ToString('dd/MM/yyyy HH:mm:ss'); id = $_.Id; level = $_.LevelDisplayName; provider = $_.ProviderName; message = $msg }
}
Out-Json $list
