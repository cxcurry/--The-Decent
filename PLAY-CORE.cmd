@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 LTS, then reopen this window.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\next.cmd" (
  call npm.cmd ci
  if errorlevel 1 goto failed
)
call npm.cmd run db:seed
if errorlevel 1 goto failed
echo.
echo When the server says Ready, open localhost:3000 in your browser.
echo Keep this window open while playing.
call npm.cmd run dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo Startup stopped. Please share the error above so it can be diagnosed.
pause
exit /b 1
