try {
    $s = New-Object -ComObject Microsoft.Update.Session
    $r = $s.CreateUpdateSearcher().Search('IsInstalled=0 and IsHidden=0')
    $list = foreach ($u in $r.Updates) {
        [pscustomobject]@{ title = $u.Title; kb = (@($u.KBArticleIDs) -join ', '); sizeMB = [math]::Round($u.MaxDownloadSize / 1MB, 1)
            mandatory = [bool]$u.IsMandatory; driver = ($u.Type -eq 2); cats = (@($u.Categories | ForEach-Object { $_.Name }) -join ', ') }
    }
    Out-JsonObj ([pscustomobject]@{ ok = $true; updates = @($list) })
} catch {
    Out-JsonObj ([pscustomobject]@{ ok = $false; error = $_.Exception.Message; updates = @() })
}
