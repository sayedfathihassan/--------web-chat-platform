@echo off
title Chat Stars Launcher
echo.
echo    [ Chat Stars: Admin Platform ]
echo    ------------------------------
echo.
echo    1. Installing dependencies (if needed)...
call npm install
echo    2. Starting the Expert System...
echo.
start http://localhost:5173
npm run dev
pause
