$q = Arg 'Q'
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Out-JsonObj ([pscustomobject]@{ ok = $false; error = 'winget não encontrado.'; lines = @() }); return }
$lines = @(winget search $q --accept-source-agreements 2>&1 | ForEach-Object { [string]$_ } | ForEach-Object { ($_ -replace '[\x08\r]', '').TrimEnd() } | Where-Object { $_ -and $_ -notmatch '^[\s\-\\|/]+$' })
Out-JsonObj ([pscustomobject]@{ ok = $true; lines = $lines })
