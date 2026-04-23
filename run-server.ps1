# PowerShell script to start the DSA Tracker app
Set-Location -Path $PSScriptRoot
npm install --no-audit --no-fund
npm start
Read-Host -Prompt "Press Enter to close"
