@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Reparar Meridian v2
echo ============================================
echo   Reparar Meridian v2
echo ============================================
echo.
echo 1) Sobe o servidor na porta 3457
echo 2) Abre o app com limpeza de Service Worker
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)

rem Mata processo antigo na 3457 se existir (silencioso)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3457" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>nul
)

set PORT=3457
start "Meridian v2 (servidor)" cmd /k "cd /d "%~dp0" && set PORT=3457 && node serve.js"

echo Aguardando servidor...
timeout /t 2 /nobreak >nul

echo Abrindo com reset de Service Worker...
start "" "http://127.0.0.1:3457/?resetsw=1"

echo.
echo Se a pagina recarregar sozinha, o Meridian v2 deve abrir.
echo Deixe a janela do servidor aberta.
echo.
pause
