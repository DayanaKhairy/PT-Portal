@echo off
echo ========================================
echo Performance Testing Portal - Restart
echo ========================================
echo.

:: Change to script directory
cd /d "%~dp0"

:: Try to stop any running server
echo Stopping any running server...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start server
echo Starting server...
echo.
npm start

pause
