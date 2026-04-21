@echo off
echo Restarting Performance Testing Portal...
echo.

:: Get the directory of this script
set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.server.pid"

:: Try to stop using PID file first
if exist "%PID_FILE%" (
    echo Stopping current server (PID from file)...
    for /f "delims=" %%p in ('type "%PID_FILE%" 2^>nul') do (
        taskkill /F /PID %%p >nul 2>&1
        if errorlevel 1 (
            echo PID not found or process already stopped.
        ) else (
            echo Server stopped.
        )
    )
    del "%PID_FILE%" >nul 2>&1
) else (
    echo No PID file found, trying to stop any node.exe running server.js...
    :: Fallback: try to find node process running server.js (Windows tasklist parsing may vary)
    tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
    if errorlevel 0 (
        echo Found node processes. Attempting to stop...
        taskkill /F /IM node.exe >nul 2>&1
    )
)

:: Small delay
timeout /t 2 /nobreak >nul

echo Starting server...
cd /d "%SCRIPT_DIR%"
npm start


