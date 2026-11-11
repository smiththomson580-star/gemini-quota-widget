param([switch]$Restore)
$ErrorActionPreference='Stop'
$installRoot=Join-Path $env:LOCALAPPDATA 'Google\Gemini'
$versions=@(Get-ChildItem -LiteralPath $installRoot -Directory | Where-Object {$_.Name -match '^app-\d+\.\d+\.\d+$'} | Sort-Object {[version]($_.Name -replace '^app-','')} -Descending)
if(!$versions.Count){throw 'Gemini Windows installation was not found.'}
$runtime=Join-Path $installRoot 'gemini-fox-widget'
$disabled=Join-Path $installRoot 'gemini-widget-watch.disabled'
$runKey='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName='GeminiQuotaWidgetCompatibility'
if($Restore){
  $running=@(Get-CimInstance Win32_Process -Filter "Name='Gemini.exe'" | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($installRoot,[StringComparison]::OrdinalIgnoreCase)})
  if($running.Count){throw 'Exit Gemini normally before restoring.'}
  Set-Content -LiteralPath $disabled -Value 'disabled'
  Remove-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 4
  foreach($version in $versions){
    $resources=Join-Path $version.FullName 'resources'
    $name='app.asar.before-gemini-fox-'+($version.Name -replace '^app-','')
    $metadata=Join-Path $resources 'gemini-widget-adapter.json'
    if(Test-Path -LiteralPath $metadata){
      $saved=(Get-Content -LiteralPath $metadata -Raw | ConvertFrom-Json).backup
      if($saved -and [IO.Path]::GetFileName($saved) -eq $saved -and $saved.StartsWith('app.asar.before-gemini-fox-')){$name=$saved}
    }
    $backup=Join-Path $resources $name
    if(Test-Path -LiteralPath $backup){Copy-Item -LiteralPath $backup -Destination (Join-Path $resources 'app.asar') -Force}
  }
  Write-Host 'Restored original clients and disabled automatic reconnection.'
  exit
}
$node=(Get-Command node -ErrorAction Stop).Source
& $node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
if($LASTEXITCODE -ne 0){throw 'Node.js 22 or newer is required.'}
if(!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\esbuild'))){throw 'Run npm ci in the project directory first.'}
& $node (Join-Path $PSScriptRoot 'scripts\build.cjs')
if($LASTEXITCODE -ne 0){throw 'Widget build failed.'}
$stage=Join-Path $installRoot ('gemini-widget-stage-'+[Guid]::NewGuid().ToString('N'))
$null=New-Item -ItemType Directory -Path $stage
foreach($file in @('gemini-fox-widget.user.js','official-quota.cjs','desktop-updater.cjs','desktop-hook.cjs','archive-patcher.cjs','client-watch.cjs','widget-version.json')){
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot ('dist\'+$file)) -Destination (Join-Path $stage $file)
}
$previous=$null
if(Test-Path -LiteralPath $runtime){
  $previous=$runtime+'.before-install-'+[Guid]::NewGuid().ToString('N')
  [IO.Directory]::Move($runtime,$previous)
}
try{[IO.Directory]::Move($stage,$runtime)}catch{if($previous){[IO.Directory]::Move($previous,$runtime)};throw}
if(Test-Path -LiteralPath $disabled){Remove-Item -LiteralPath $disabled}
& $node (Join-Path $runtime 'client-watch.cjs') --once
if($LASTEXITCODE -ne 0){throw 'Client compatibility check failed.'}
$launcher=Join-Path $installRoot 'gemini-widget-watch.vbs'
$script='Set shell = CreateObject("WScript.Shell")'+[Environment]::NewLine+'shell.Run """'+$node+'"" ""'+(Join-Path $runtime 'client-watch.cjs')+'""", 0, False'
Set-Content -LiteralPath $launcher -Value $script -Encoding Unicode
$wscript=Join-Path $env:WINDIR 'System32\wscript.exe'
$null=New-Item -Path $runKey -Force
$null=New-ItemProperty -Path $runKey -Name $runName -PropertyType String -Value ('"'+$wscript+'" "'+$launcher+'"') -Force
Start-Process -FilePath $wscript -ArgumentList ('"'+$launcher+'"') -WindowStyle Hidden
Write-Host 'Installed Gemini Quota Widget and automatic client reconnection.'
Write-Host 'If Gemini is running, exit normally, wait a few seconds, then reopen.'
