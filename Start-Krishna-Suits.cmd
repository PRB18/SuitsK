@echo off
setlocal
set "APP_DIR=%~dp0"
set "NODE_EXE=%APP_DIR%runtime\node.exe"

if not exist "%NODE_EXE%" (
  echo Krishna Suits runtime is missing.
  echo Reinstall the application or contact support.
  pause
  exit /b 1
)

start "Krishna Suits Server" /min /d "%APP_DIR%" "%NODE_EXE%" server\index.js
>nul timeout /t 2 /nobreak
start "" "http://127.0.0.1:3737"
endlocal
