@echo off
rem Speech recognition needs Edge or Chrome on http://localhost (not a file), so start the local server first.
start "VerseCast server" /min node "%~dp0server.js"
timeout /t 1 /nobreak >nul
start "" msedge "http://localhost:8765/"
