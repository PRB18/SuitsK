$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot 'release'
$runtimeDir = Join-Path $releaseRoot 'runtime'

if (Test-Path $releaseRoot) {
    Remove-Item $releaseRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$nodePath = (Get-Command node -ErrorAction Stop).Source
Copy-Item $nodePath (Join-Path $runtimeDir 'node.exe')

$include = @('public', 'server', 'package.json', 'package-lock.json', 'Start-Krishna-Suits.cmd', 'Stop-Krishna-Suits.cmd')
foreach ($item in $include) {
    Copy-Item (Join-Path $projectRoot $item) $releaseRoot -Recurse -Force
}

Copy-Item (Join-Path $projectRoot 'node_modules') $releaseRoot -Recurse -Force

$unwanted = @(
    (Join-Path $releaseRoot 'node_modules\.cache'),
    (Join-Path $releaseRoot 'node_modules\.bin\esbuild.cmd'),
    (Join-Path $releaseRoot 'node_modules\.bin\esbuild.ps1')
)
foreach ($path in $unwanted) {
    if (Test-Path $path) { Remove-Item $path -Force -Recurse }
}

Write-Host "Client package staged at: $releaseRoot"
Write-Host "Vault data is intentionally excluded; it remains in AppData."
