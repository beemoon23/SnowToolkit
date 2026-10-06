$bl = @()
try { $bl = @(Get-BitLockerVolume -ErrorAction Stop | ForEach-Object { [pscustomobject]@{ mount = $_.MountPoint; status = [string]$_.VolumeStatus; protection = [string]$_.ProtectionStatus; pct = $_.EncryptionPercentage; method = [string]$_.EncryptionMethod } }) } catch { }
$tpm = $null
try { $t = Get-Tpm -ErrorAction Stop; $tpm = [pscustomobject]@{ present = [bool]$t.TpmPresent; ready = [bool]$t.TpmReady; enabled = [bool]$t.TpmEnabled; version = [string]$t.ManufacturerVersion } } catch { }
Out-JsonObj ([pscustomobject]@{ volumes = $bl; tpm = $tpm })
