$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pairs = @(
  @{
    Source = Join-Path $root 'apps\api\.env.example'
    Target = Join-Path $root 'apps\api\.env'
  },
  @{
    Source = Join-Path $root 'apps\web\.env.example'
    Target = Join-Path $root 'apps\web\.env'
  }
)

foreach ($pair in $pairs) {
  if (-not (Test-Path -LiteralPath $pair.Source)) {
    throw "Missing template file: $($pair.Source)"
  }

  if (Test-Path -LiteralPath $pair.Target) {
    Write-Host "Skipping existing file: $($pair.Target)"
    continue
  }

  Copy-Item -LiteralPath $pair.Source -Destination $pair.Target
  Write-Host "Created $($pair.Target) from template"
}

