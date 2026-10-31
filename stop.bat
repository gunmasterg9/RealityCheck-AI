@echo off
title RealityCheck AI Shutdown

echo ====================================================================
echo                 REALITYCHECK AI 2.0 SHUTDOWN
echo ====================================================================
echo.
echo Stopping services on ports 8000 (Backend) and 5173 (Frontend)...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 4 } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('[x] Stopped process ' + $_.OwningProcess + ' on port ' + $_.LocalPort) }"

taskkill /FI "WINDOWTITLE eq RealityCheck AI - Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq RealityCheck AI - Frontend*" /F >nul 2>&1

echo.
echo ====================================================================
echo    All RealityCheck AI services have been stopped successfully.
echo ====================================================================
echo.
exit /b 0
