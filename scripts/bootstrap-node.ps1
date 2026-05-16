# Portable Node.js bootstrap for TT-Beamer click-and-run scripts (Phase 45).
#
# Dot-source this file from start.ps1 to pull in:
#   Ensure-PortableNode      — idempotent: install/verify .node-portable\
#   $script:NodePortableBin  — absolute path to .node-portable\ (set on success)
#
# Strategy: download the latest Node 22.x LTS Windows zip from nodejs.org
# to .node-portable\, verified by SHA256 against the official SHASUMS256.txt.
# No admin, no UAC, no PATH mutation outside of this script process.

$script:PortableNodeDir   = ".node-portable"
$script:PortableNodeMajor = 22
$script:PortableNodeDist  = "https://nodejs.org/dist/latest-v$script:PortableNodeMajor.x"

function Ensure-PortableNode {
  $existing = Join-Path $script:PortableNodeDir "node.exe"
  if (Test-Path -LiteralPath $existing) {
    try {
      $ver = & $existing --version 2>$null
      if ($LASTEXITCODE -eq 0 -and $ver -match "^v$script:PortableNodeMajor\.") {
        $script:NodePortableBin = (Resolve-Path -LiteralPath $script:PortableNodeDir).Path
        $env:PATH = "$script:NodePortableBin;$env:PATH"
        Write-Host "[bootstrap-node] Reusing portable Node $ver at $script:NodePortableBin"
        return $true
      }
      Write-Host "[bootstrap-node] Existing portable Node $ver doesn't match required v$script:PortableNodeMajor.x; refetching."
    } catch {
      Write-Host "[bootstrap-node] Existing portable Node looks broken; refetching."
    }
    Remove-Item -Recurse -Force -LiteralPath $script:PortableNodeDir -ErrorAction SilentlyContinue
  }

  if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64' -and $env:PROCESSOR_ARCHITECTURE -ne 'ARM64') {
    Write-Host "[bootstrap-node] ERROR: unsupported architecture: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor Red
    return $false
  }
  $nodeArch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { "win-arm64" } else { "win-x64" }

  Write-Host "[bootstrap-node] Resolving latest Node v$script:PortableNodeMajor.x from nodejs.org …"
  try {
    $shasums = (Invoke-WebRequest -Uri "$script:PortableNodeDist/SHASUMS256.txt" -UseBasicParsing).Content
  } catch {
    Write-Host "[bootstrap-node] ERROR: couldn't reach nodejs.org/dist. Check your internet connection (or proxy)." -ForegroundColor Red
    Write-Host "[bootstrap-node]   $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }

  $pattern = "node-v$script:PortableNodeMajor\.\d+\.\d+-$nodeArch\.zip$"
  $line = ($shasums -split "`n") | Where-Object { $_ -match $pattern } | Select-Object -First 1
  if (-not $line) {
    Write-Host "[bootstrap-node] ERROR: no Node $nodeArch zip in SHASUMS256.txt" -ForegroundColor Red
    return $false
  }
  $parts = $line.Trim() -split "\s+", 2
  $expectedSha = $parts[0]
  $zipName     = $parts[1]

  $dlDir = "$script:PortableNodeDir.dl"
  $zipPath = Join-Path $dlDir $zipName
  New-Item -ItemType Directory -Force -Path $dlDir | Out-Null

  Write-Host "[bootstrap-node] Downloading $zipName …"
  try {
    Invoke-WebRequest -Uri "$script:PortableNodeDist/$zipName" -OutFile $zipPath -UseBasicParsing
  } catch {
    Write-Host "[bootstrap-node] ERROR: download failed for $zipName" -ForegroundColor Red
    Write-Host "[bootstrap-node]   $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force -LiteralPath $dlDir -ErrorAction SilentlyContinue
    return $false
  }

  Write-Host "[bootstrap-node] Verifying SHA256 …"
  $actualSha = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualSha -ne $expectedSha.ToLowerInvariant()) {
    Write-Host "[bootstrap-node] ERROR: SHA256 mismatch for $zipName" -ForegroundColor Red
    Write-Host "[bootstrap-node]   Expected: $expectedSha" -ForegroundColor Red
    Write-Host "[bootstrap-node]   Actual:   $actualSha" -ForegroundColor Red
    Remove-Item -Recurse -Force -LiteralPath $dlDir -ErrorAction SilentlyContinue
    return $false
  }

  Write-Host "[bootstrap-node] Extracting …"
  $extractDir = Join-Path $dlDir "extract"
  Remove-Item -Recurse -Force -LiteralPath $extractDir -ErrorAction SilentlyContinue
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

  $top = Get-ChildItem -LiteralPath $extractDir -Directory | Select-Object -First 1
  if (-not $top) {
    Write-Host "[bootstrap-node] ERROR: extracted archive layout unexpected" -ForegroundColor Red
    Remove-Item -Recurse -Force -LiteralPath $dlDir -ErrorAction SilentlyContinue
    return $false
  }

  Remove-Item -Recurse -Force -LiteralPath $script:PortableNodeDir -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $top.FullName -Destination $script:PortableNodeDir
  Remove-Item -Recurse -Force -LiteralPath $dlDir -ErrorAction SilentlyContinue

  $script:NodePortableBin = (Resolve-Path -LiteralPath $script:PortableNodeDir).Path
  $env:PATH = "$script:NodePortableBin;$env:PATH"

  $installedVer = & (Join-Path $script:NodePortableBin "node.exe") --version 2>$null
  Write-Host "[bootstrap-node] Node $installedVer installed at $script:NodePortableBin"
  return $true
}
