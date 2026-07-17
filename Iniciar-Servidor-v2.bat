@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Meridian v2 (servidor 3457) - feche para parar
set PORT=3457
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)
echo ============================================
echo  Meridian v2 - NAO e a v1 (Copa)
echo  http://localhost:3457/
echo ============================================
echo Feche esta janela para parar o servidor.
echo.
node serve.js
if errorlevel 1 pause
