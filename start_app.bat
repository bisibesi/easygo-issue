@echo off
chcp 65001 > nul
setlocal

echo [EasyGo Issue] Launcher

:: 1. Check for Portable Node.js in /bin
if exist "%~dp0bin\node.exe" (
    echo [INFO] Found portable Node.js in /bin
    set "PATH=%~dp0bin;%PATH%"
)

:: 2. Check if Node is available
node --version >nul 2>&1
if %errorlevel% neq 0 goto :NO_NODE

:: 3. Check if we need to install dependencies
if exist "%~dp0node_modules" goto :SKIP_INSTALL
echo [SETUP] Installing dependencies...
call npm.cmd install
if %errorlevel% neq 0 goto :INSTALL_FAIL
:SKIP_INSTALL
echo [INFO] Dependencies OK.

:: 4. Build Frontend (Optimize: Skip if dist/index.html exists)
if exist "%~dp0dist\index.html" (
    echo [INFO] Build artifacts (dist/index.html) found. Skipping build step for faster startup...
    goto :RUN_SERVER
)

echo [SETUP] Building frontend (First time run)...
call npm.cmd run build
if %errorlevel% neq 0 goto :BUILD_FAIL

:RUN_SERVER
:: 5. Cleanup & Run Server
echo.
echo [START] Running EasyGo Issue...
echo [INFO] Server starting...

timeout /t 1 /nobreak >nul

echo.
echo.
call node server/index.js
goto :END

:NO_NODE
echo [ERROR] Node.js is not found!
echo 1. Install Node.js from https://nodejs.org/
echo 2. OR download 'node.exe' and place it in a 'bin' folder inside this project (Portable Mode).
pause
exit /b 1

:INSTALL_FAIL
echo [ERROR] Failed to install dependencies. npm is required for initial setup.
pause
exit /b 1

:BUILD_FAIL
echo [ERROR] Failed to build frontend.
pause
exit /b 1

:END
pause
