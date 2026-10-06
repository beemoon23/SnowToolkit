$hours = [int](Arg 'HOURS' '24')
$ev = Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4625; StartTime = (Get-Date).AddHours(-$hours) } -MaxEvents 1000 -ErrorAction SilentlyContinue
$list = $ev | ForEach-Object {
    $p = $_.Properties
    [pscustomobject]@{ time = $_.TimeCreated.ToString('dd/MM/yyyy HH:mm:ss'); user = [string]$p[5].Value; domain = [string]$p[6].Value
        logonType = [string]$p[10].Value; workstation = [string]$p[13].Value; ip = [string]$p[19].Value }
}
Out-Json $list
