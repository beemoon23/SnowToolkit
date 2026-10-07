# SnowCleaner: varredura (somente leitura). Nada e apagado aqui.
$admin = $false
try { $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) } catch { }
$drive = $env:SystemDrive.TrimEnd(':')
$free = 0.0
try { $free = [double](Get-PSDrive -Name $drive).Free } catch { }
$out = @()
foreach ($it in (Get-CleanCatalog)) {
    $m = Measure-CleanItem $it
    $running = @()
    foreach ($pn in $it.proc) { if (Get-Process -Name $pn -ErrorAction SilentlyContinue) { $running += $pn } }
    # itens de arquivos sem nada encontrado e sem pasta existente nao aparecem
    $exists = ($it.paths.Count -gt 0) -or ($it.special -ne '')
    if (-not $exists) { continue }
    $out += [pscustomobject]@{
        id = $it.id; group = $it.group; label = $it.label; desc = $it.desc; risk = $it.risk
        admin = $it.admin; readonly = $it.readonly; special = $it.special
        bytes = $m.bytes; files = $m.files; running = @($running)
    }
}
Out-JsonObj ([pscustomobject]@{ ok = $true; admin = $admin; free = $free; items = @($out) })
