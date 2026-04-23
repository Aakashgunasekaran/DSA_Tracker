@echo off
REM Start the DSA Tracker app from Windows by double-clicking this file
cd /d "%~dp0"
npm install --no-audit --no-fund
npm start
pause
