$list = Get-Printer -ErrorAction SilentlyContinue | ForEach-Object {
    $jobs = 0
    try { $jobs = @(Get-PrintJob -PrinterName $_.Name -ErrorAction Stop).Count } catch { }
    [pscustomobject]@{ name = $_.Name; driver = $_.DriverName; port = $_.PortName; status = [string]$_.PrinterStatus; shared = [bool]$_.Shared; jobs = $jobs }
}
Out-Json $list
