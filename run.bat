@echo off
setlocal enabledelayedexpansion
title RealityCheck AI Launcher

echo ====================================================================
echo                 REALITYCHECK AI 2.0 LAUNCHER
echo          "Don't just trust an answer. Challenge it."
echo ====================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python not found in PATH. Please install Python 3.12+ and try again.
    pause
    exit /b 1
)

:: 2. Check Node / npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js/npm not found in PATH. Please install Node.js and try again.
    pause
    exit /b 1
)

:: 3. Start Backend in separate window
echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "RealityCheck AI - Backend" cmd /k "cd /d "%~dp0" && set PYTHONPATH=backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

:: 4. Start Frontend in separate window
echo [2/3] Starting Vite Frontend on http://localhost:5173 ...
start "RealityCheck AI - Frontend" cmd /k "cd /d "%~dp0\frontend" && npm.cmd run dev"

:: 5. Wait a few seconds for services to initialize
echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

:: 6. Open default browser
echo.
echo ====================================================================
echo    RealityCheck AI 2.0 is now running!
echo    - Frontend:         http://localhost:5173
echo    - Backend API Docs: http://127.0.0.1:8000/docs
echo    - To stop all services, double-click: stop.bat
echo ====================================================================
echo.

start http://localhost:5173

exit /b 0

