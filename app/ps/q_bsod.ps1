$ev = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 1001; ProviderName = 'Microsoft-Windows-WER-SystemErrorReporting'; StartTime = (Get-Date).AddDays(-90) } -MaxEvents 50 -ErrorAction SilentlyContinue | ForEach-Object {
    [pscustomobject]@{ time = $_.TimeCreated.ToString('dd/MM/yyyy HH:mm:ss'); message = ($_.Message -split "`n")[0].Trim() }
})
$dumps = @()
if (Test-Path "$env:windir\Minidump") { $dumps = @(Get-ChildItem "$env:windir\Minidump" -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ name = $_.Name; kb = [math]::Round($_.Length / 1KB); time = $_.LastWriteTime.ToString('dd/MM/yyyy HH:mm') } }) }
$full = $null
if (Test-Path "$env:windir\MEMORY.DMP") { $f = Get-Item "$env:windir\MEMORY.DMP"; $full = [pscustomobject]@{ mb = [math]::Round($f.Length / 1MB); time = $f.LastWriteTime.ToString('dd/MM/yyyy HH:mm') } }
Out-JsonObj ([pscustomobject]@{ events = $ev; dumps = $dumps; full = $full })
