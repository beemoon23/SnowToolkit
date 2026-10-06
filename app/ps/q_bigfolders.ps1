$root = Arg 'PATH' ($env:SystemDrive + '\')
if (-not (Test-Path -LiteralPath $root)) { Out-JsonObj ([pscustomobject]@{ ok = $false; error = 'Caminho não encontrado.'; items = @() }); return }
$items = @()
foreach ($d in (Get-ChildItem -LiteralPath $root -Directory -Force -ErrorAction SilentlyContinue)) {
    $items += [pscustomobject]@{ name = $d.Name; path = $d.FullName; bytes = (Size-Of $d.FullName); dir = $true }
}
$files = Get-ChildItem -LiteralPath $root -File -Force -ErrorAction SilentlyContinue
foreach ($f in $files) { $items += [pscustomobject]@{ name = $f.Name; path = $f.FullName; bytes = [double]$f.Length; dir = $false } }
Out-JsonObj ([pscustomobject]@{ ok = $true; root = $root; items = @($items | Sort-Object bytes -Descending | Select-Object -First 80) })
