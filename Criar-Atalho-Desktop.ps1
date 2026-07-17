# Cria (ou atualiza) SOMENTE o atalho do Meridian v2 na area de trabalho.
# NUNCA toca no atalho "Meridian" da v1.
# Uso: powershell -ExecutionPolicy Bypass -File .\Criar-Atalho-Desktop.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Vbs = Join-Path $Root "Abrir-Meridian-v2.vbs"
$Ico = Join-Path $Root "assets\meridian.ico"

if (-not (Test-Path $Vbs)) { throw "Falta Abrir-Meridian-v2.vbs em $Root" }
if (-not (Test-Path (Join-Path $Root "ISOLAMENTO.md"))) {
  Write-Warning "ISOLAMENTO.md ausente - confira se esta e a pasta do Meridian v2."
}

$Desktop = [Environment]::GetFolderPath("Desktop")
if (-not $Desktop -or -not (Test-Path $Desktop)) {
  $Desktop = Join-Path $env:USERPROFILE "Desktop"
}

# Nome proprio do Meridian v2 - nunca Meridian.lnk (esse e da v1)
$LnkName = "Meridian v2.lnk"
$LnkPath = Join-Path $Desktop $LnkName

$Wsh = New-Object -ComObject WScript.Shell
$Lnk = $Wsh.CreateShortcut($LnkPath)
$Lnk.TargetPath = $Vbs
$Lnk.WorkingDirectory = $Root
$Lnk.Description = "Meridian v2 multi-campeonato (porta 3457). NAO e o Meridian v1."
$Lnk.WindowStyle = 1
if (Test-Path $Ico) {
  $Lnk.IconLocation = "$Ico,0"
}
$Lnk.Save()

Write-Host "Atalho do Meridian v2:"
Write-Host "  $LnkPath"
Write-Host "  -> $Vbs"
Write-Host ""
Write-Host "O atalho 'Meridian' (v1, porta 3456) NAO e alterado."
