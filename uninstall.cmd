@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0install.ps1" -Restore
pause
