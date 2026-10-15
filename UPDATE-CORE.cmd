@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  echo Save UPDATE-CORE.cmd in the game folder next to package.json, then run it again.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 LTS, then reopen this window.
  pause
  exit /b 1
)
node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.listen(3000,'127.0.0.1',()=>s.close());"
if errorlevel 1 (
  echo Stop the running game with Ctrl+C in its terminal, then run this updater again.
  pause
  exit /b 1
)
echo Downloading the Everyday edition and animated environment...
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $stage=Join-Path ([IO.Path]::GetTempPath()) ('core-descent-'+[guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Path $stage | Out-Null; $archive=Join-Path $stage 'source.zip'; Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/cxcurry/--The-Decent/archive/refs/heads/main.zip' -OutFile $archive; Expand-Archive -LiteralPath $archive -DestinationPath $stage; $source=Get-ChildItem -LiteralPath $stage -Directory | Where-Object {Test-Path (Join-Path $_.FullName 'package.json')} | Select-Object -First 1; if (-not $source) {throw 'The downloaded archive did not contain the game.'}; Get-ChildItem -LiteralPath $source.FullName -Force | Where-Object {$_.Name -notin @('UPDATE-CORE.cmd','.local','.git','node_modules','.next') -and ($_.Name -notlike '.env*' -or $_.Name -eq '.env.example')} | Copy-Item -Destination (Get-Location).Path -Recurse -Force; Write-Host 'Game source updated. Your local database is preserved.'"
if errorlevel 1 goto failed
call npm.cmd ci
if errorlevel 1 goto failed
call npm.cmd run db:seed
if errorlevel 1 goto failed
echo.
echo The update is installed. Starting CORE - THE DESCENT.
echo When the server says Ready, open localhost:3000 in your browser.
echo Keep this window open while playing.
call npm.cmd run dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo The update stopped. Please share the error above so it can be diagnosed.
pause
exit /b 1
