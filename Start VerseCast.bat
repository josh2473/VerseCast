@echo off
rem Starts the VerseCast server (minimized). It opens VerseCast in Chrome (or Edge) itself, unless it's already open.
start "VerseCast server" /min node "%~dp0server.js"
