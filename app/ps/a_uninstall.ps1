$cmd = Arg 'CMD'
$name = Arg 'NAME' 'programa'
if (-not $cmd) { Fail 'Este programa não informa um desinstalador.'; return }
Step ('Desinstalando ' + $name)
Write-Host ('   comando: ' + $cmd)
try {
    if ($cmd -match '^\s*msiexec(\.exe)?\s+/I') { $cmd = $cmd -replace '/I', '/X' }
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $cmd -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -eq 0 -or $p.ExitCode -eq 3010) { Ok ('Concluído (código ' + $p.ExitCode + ').') } else { Warn ('O desinstalador terminou com código ' + $p.ExitCode + '. Alguns abrem janela própria e precisam de confirmação.') }
} catch { Fail $_.Exception.Message }
