@echo off
cd /d "%~dp0"
title Greenview Tour - Local
call npm run dev -- --open
if errorlevel 1 pause
