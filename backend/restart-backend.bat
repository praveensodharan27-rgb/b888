@echo off
echo.
echo ============================================
echo   Backend Server Restart Script
echo ============================================
echo.

echo [1/3] Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo       SUCCESS: All Node processes killed
) else (
    echo       INFO: No Node processes found
)

echo.
echo [2/3] Waiting for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting backend server...
echo.
echo       Backend: http://localhost:5000
echo       Frontend: http://localhost:3000
echo.
echo ============================================
echo.

npm start
