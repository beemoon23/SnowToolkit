$all = (Arg 'ALL' '0') -eq '1'
$tasks = Get-ScheduledTask -ErrorAction SilentlyContinue
if (-not $all) { $tasks = $tasks | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } }
$list = $tasks | ForEach-Object {
    $a = $_.Actions | Select-Object -First 1
    $cmd = ''
    if ($a) { $cmd = (($a.Execute + ' ' + $a.Arguments)).Trim() }
    [pscustomobject]@{ name = $_.TaskName; path = $_.TaskPath; state = [string]$_.State; author = $_.Author; command = $cmd }
}
Out-Json $list
