@echo off
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "127.0.0.1:3737.*LISTENING"') do taskkill /PID %%P /T /F >nul 2>&1
