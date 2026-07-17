# Copia o Meridian-v2 para um drive (USB/externo).
# Uso:
#   .\Copiar-Para-Drive.ps1 -Drive F
#   .\Copiar-Para-Drive.ps1 -Drive E -Zip
#   .\Copiar-Para-Drive.ps1 -Destino "D:\Backups\Meridian-v2"

param(
  [string]$Drive = "",
  [string]$Destino = "",
  [switch]$Zip
)

$ErrorActionPreference = "Stop"
$Src = $PSScriptRoot
if (-not (Test-Path (Join-Path $Src "serve.js"))) {
  throw "Rode este script de dentro da pasta Meridian-v2."
}

$stamp = Get-Date -Format "yyyy-MM-dd"
$folderName = "Meridian-v2-$stamp"

if ($Destino) {
  $DestRoot = $Destino
} elseif ($Drive) {
  $letter = $Drive.TrimEnd(':').ToUpper()
  if (-not (Test-Path ($letter + ":\"))) {
    throw "Drive ${letter}: nao encontrado."
  }
  $DestRoot = Join-Path ($letter + ":\") $folderName
} else {
  Write-Host "Drives disponiveis:"
  Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -match '^[D-Z]$' } | ForEach-Object {
    $freeGb = if ($null -ne $_.Free) { [math]::Round($_.Free / 1GB, 1) } else { "?" }
    Write-Host ("  " + $_.Name + ":  livre ~" + $freeGb + " GB")
  }
  Write-Host ""
  Write-Host "Exemplos:"
  Write-Host "  .\Copiar-Para-Drive.ps1 -Drive F"
  Write-Host "  .\Copiar-Para-Drive.ps1 -Drive E -Zip"
  exit 1
}

New-Item -ItemType Directory -Path $DestRoot -Force | Out-Null

Write-Host "Origem : $Src"
Write-Host "Destino: $DestRoot"
Write-Host "Copiando..."

$log = Join-Path $env:TEMP "meridian-v2-robocopy.log"
$rcArgs = @(
  $Src, $DestRoot,
  "/E", "/COPY:DAT", "/R:2", "/W:2",
  "/NFL", "/NDL", "/NJH", "/NJS", "/NP",
  "/XD", "node_modules", ".next", "dist",
  "/XF", "Thumbs.db", "desktop.ini",
  "/LOG:$log"
)
& robocopy @rcArgs | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) {
  Write-Host "ERRO robocopy codigo $rc - veja $log"
  exit $rc
}

foreach ($f in @("LEIA-ME-DRIVE.md", "HANDOFF-v2.md", "Copiar-Para-Drive.ps1")) {
  $p = Join-Path $Src $f
  if (Test-Path $p) {
    Copy-Item $p (Join-Path $DestRoot $f) -Force
  }
}

$allFiles = Get-ChildItem $DestRoot -Recurse -File -Force -ErrorAction SilentlyContinue
$files = ($allFiles | Measure-Object).Count
$size = ($allFiles | Measure-Object Length -Sum).Sum
Write-Host ("OK pasta: {0} arquivos, {1:N1} MB" -f $files, ($size / 1MB))

if ($Zip) {
  $zipPath = "$DestRoot.zip"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Write-Host "Criando zip: $zipPath"
  Compress-Archive -Path $DestRoot -DestinationPath $zipPath -CompressionLevel Optimal
  $zs = (Get-Item $zipPath).Length
  Write-Host ("OK zip: {0:N1} MB" -f ($zs / 1MB))
}

Write-Host ""
Write-Host "Pronto."
Write-Host "Na outra maquina:"
Write-Host "  1. Copie a pasta do drive para um local PROPRIO - nao em cima do Meridian."
Write-Host "  2. Na pasta: set PORT=3457 e node serve.js"
Write-Host "  3. Abra o Grok nessa pasta e leia HANDOFF-v2.md"
Write-Host ""
Write-Host "Ejecte o drive com seguranca antes de desconectar."
