$ErrorActionPreference = "Stop"

$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

if (-not (Test-Path ".env")) {
  Copy-Item "config\.env.example" ".env"
  Write-Host "Created .env from config\.env.example"
  Write-Host "Please edit .env and set QWEN_API_KEY before using AI features."
  Write-Host ""
}

$port = "4321"
$envLine = Select-String -Path ".env" -Pattern "^\s*PORT\s*=\s*(.+)\s*$" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($envLine) {
  $port = $envLine.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
}

function Find-CommandPath($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$node = Find-CommandPath "node"
if ($node) {
  Write-Host "Starting with Node: $node"
  Write-Host "Open http://127.0.0.1:$port"
  & $node "server\server.js"
  exit $LASTEXITCODE
}

$python = Find-CommandPath "python"
if ($python) {
  Write-Host "Starting with Python: $python"
  Write-Host "Open http://127.0.0.1:$port"
  & $python "server\server.py"
  exit $LASTEXITCODE
}

$py = Find-CommandPath "py"
if ($py) {
  Write-Host "Starting with Python launcher: $py"
  Write-Host "Open http://127.0.0.1:$port"
  & $py "-3" "server\server.py"
  exit $LASTEXITCODE
}

Write-Host "Could not find Node.js or Python."
Write-Host "Install one of them, then run start-ai.bat again."
Write-Host "Node: https://nodejs.org/"
Write-Host "Python: https://www.python.org/downloads/"
Read-Host "Press Enter to exit"
exit 1
