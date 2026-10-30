param([switch]$Restore)
$ErrorActionPreference='Stop'
$installRoot=Join-Path $env:LOCALAPPDATA 'Google\Gemini'
$versionDir=Get-ChildItem -LiteralPath $installRoot -Directory | Where-Object {$_.Name -match '^app-\d+\.\d+\.\d+$'} | Sort-Object {[version]($_.Name -replace '^app-','')} -Descending | Select-Object -First 1
if(!$versionDir){throw 'Gemini Windows installation was not found.'}
# Only the version actually tested by this project is enabled. Fail closed after app updates.
if($versionDir.Name -ne 'app-1.17.0'){throw 'Unsupported Gemini version. This release supports 1.17.0 only.'}
$running=@(Get-CimInstance Win32_Process -Filter "Name='Gemini.exe'" | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.StartsWith($installRoot,[StringComparison]::OrdinalIgnoreCase)})
if($running.Count){throw 'Exit Gemini normally using its menu before installing or restoring.'}
$resources=Join-Path $versionDir.FullName 'resources'
$archive=Join-Path $resources 'app.asar'
$backup=Join-Path $resources 'app.asar.before-gemini-fox-1.17.0'
if($Restore){
  if(!(Test-Path -LiteralPath $backup)){throw 'Original application backup not found.'}
  Copy-Item -LiteralPath $backup -Destination $archive -Force
  Write-Host 'Restored original application. Widget data and files have been retained.'
  exit
}
$node=(Get-Command node -ErrorAction Stop).Source
& $node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
if($LASTEXITCODE -ne 0){throw 'Node.js 22 or newer is required.'}
if(!(Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\esbuild'))){throw 'Run npm ci in the project directory first.'}
& $node (Join-Path $PSScriptRoot 'scripts\build.cjs')
if($LASTEXITCODE -ne 0){throw 'Widget build failed.'}
if(!(Test-Path -LiteralPath $backup)){Copy-Item -LiteralPath $archive -Destination $backup}
& $node (Join-Path $PSScriptRoot 'scripts\patch-archive.cjs') $backup
if($LASTEXITCODE -ne 0){throw 'Archive validation failed. The current application was not changed.'}
$widget=Join-Path $resources 'gemini-fox-widget'
$null=New-Item -ItemType Directory -Path $widget -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'dist\gemini-fox-widget.user.js') -Destination (Join-Path $widget 'gemini-fox-widget.user.js') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'src\official-quota.cjs') -Destination (Join-Path $widget 'official-quota.cjs') -Force
try {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'build\app.patched.asar') -Destination $archive -Force
  $expected=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'build\archive-verification.json') -Raw | ConvertFrom-Json
  if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ine $expected.patchedSha256){throw 'Archive checksum mismatch.'}
} catch {
  Copy-Item -LiteralPath $backup -Destination $archive -Force
  throw
}
Write-Host 'Installed Gemini Quota Widget. Start Gemini normally.'
