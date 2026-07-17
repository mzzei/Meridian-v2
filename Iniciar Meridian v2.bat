@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Meridian v2
echo ============================================
echo   Meridian v2 - multi-campeonato
echo ============================================
echo.
echo Iniciando servidor em http://localhost:3457/ ...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado.
  echo Instale em https://nodejs.org e tente de novo.
  echo.
  pause
  exit /b 1
)

rem Porta 3457: serve.js ja usa 3457 por padrao no Meridian v2.
rem /k mantem a janela aberta se der erro.
start "Meridian v2 (servidor)" cmd /k "cd /d "%~dp0" && set PORT=3457 && node serve.js"

echo Aguardando o servidor subir...
timeout /t 2 /nobreak >nul
echo Abrindo no navegador...
start "" "http://localhost:3457/"
echo.
echo Pronto! Servidor em http://127.0.0.1:3457/
echo.
echo Uso normal do app instalado no Edge:
echo   1) Deixe ESTE servidor ligado so nesta visita (grava/atualiza o cache)
echo   2) Abra o Meridian v2 pelo menu Iniciar
echo   3) Depois pode fechar o servidor - o app continua abrindo offline
echo.
echo (Análises com IA ainda precisam de internet; so o Node local fica opcional.)
echo.
pause
