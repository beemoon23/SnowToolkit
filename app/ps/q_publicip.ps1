try {
    $r = Invoke-RestMethod -Uri 'https://ipinfo.io/json' -TimeoutSec 8 -ErrorAction Stop
    Out-JsonObj ([pscustomobject]@{ ok = $true; ip = $r.ip; city = $r.city; region = $r.region; org = $r.org; country = $r.country })
} catch {
    try {
        $r = Invoke-RestMethod -Uri 'https://api.ipify.org?format=json' -TimeoutSec 8 -ErrorAction Stop
        Out-JsonObj ([pscustomobject]@{ ok = $true; ip = $r.ip })
    } catch { Out-JsonObj ([pscustomobject]@{ ok = $false; error = 'Sem acesso à internet ou serviço indisponível.' }) }
}
