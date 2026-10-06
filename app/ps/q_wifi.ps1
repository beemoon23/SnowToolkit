$utf = [Console]::OutputEncoding
try { [Console]::OutputEncoding = [Text.Encoding]::GetEncoding([Globalization.CultureInfo]::CurrentCulture.TextInfo.OEMCodePage) } catch { }
$names = @()
foreach ($l in (netsh wlan show profiles)) {
    if ($l -match '^\s*[^:]*(Profile|Perfil)[^:]*:\s*(.+?)\s*$') { $names += $Matches[2] }
}
$list = foreach ($n in $names) {
    $d = netsh wlan show profile name="$n" key=clear
    $pw = $null; $auth = ''
    foreach ($l in $d) {
        if ($l -match '^\s*(Key Content|Conte.do da Chave)\s*:\s*(.*)$') { $pw = $Matches[2].Trim() }
        if (-not $auth -and $l -match '^\s*(Authentication|Autentica..o)\s*:\s*(.*)$') { $auth = $Matches[2].Trim() }
    }
    [pscustomobject]@{ name = $n; password = $pw; auth = $auth }
}
try { [Console]::OutputEncoding = $utf } catch { }
Out-Json $list
