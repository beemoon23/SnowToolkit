$adm = @{}
try { Get-LocalGroupMember -SID 'S-1-5-32-544' -ErrorAction Stop | ForEach-Object { $adm[($_.Name -split '\\')[-1]] = $true } } catch { }
$list = Get-LocalUser | ForEach-Object {
    [pscustomobject]@{ name = $_.Name; fullName = $_.FullName; enabled = [bool]$_.Enabled; admin = [bool]$adm[$_.Name]
        lastLogon = $(if ($_.LastLogon) { $_.LastLogon.ToString('dd/MM/yyyy HH:mm') } else { '' })
        pwdExpires = $(if ($_.PasswordExpires) { $_.PasswordExpires.ToString('dd/MM/yyyy') } else { 'nunca' })
        pwdRequired = [bool]$_.PasswordRequired; desc = $_.Description }
}
Out-Json $list
