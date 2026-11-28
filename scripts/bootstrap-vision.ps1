function Initialize-VisionRuntime {
  param([string]$Root, [switch]$DryRun)

  if ($env:TT_BEAMER_VISION_AUTOSTART -eq '0') { return }
  if (-not $DryRun) { $env:TT_BEAMER_VISION_AUTOSTART = '1' }

  $directory = Join-Path $Root '.vision'
  $settingsPath = Join-Path $directory 'settings.json'
  $settings = $null
  if (Test-Path -LiteralPath $settingsPath -PathType Leaf) {
    try { $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json } catch {}
  }
  if ($env:TT_BEAMER_VISION_PYTHON -or ($settings.python -is [string] -and $settings.python)) { return }
  $runtime = Join-Path $directory 'venv'
  $python = Join-Path $runtime 'Scripts\python.exe'
  if (-not (Test-Path -LiteralPath $python) -and $env:LOCALAPPDATA -and
    (Test-Path -LiteralPath (Join-Path $env:LOCALAPPDATA 'tt-beamer-vision\Scripts\python.exe'))) { return }

  $checkpoint = $env:TT_BEAMER_VISION_CHECKPOINT
  if (-not $checkpoint -and $settings.checkpoint -is [string]) { $checkpoint = $settings.checkpoint }
  if (-not $checkpoint) { $checkpoint = '.vision\nemesis.pth' }
  if (-not [IO.Path]::IsPathRooted($checkpoint)) { $checkpoint = Join-Path $Root $checkpoint }
  if (-not (Test-Path -LiteralPath $checkpoint -PathType Leaf)) {
    Write-Host "[vision] Trained checkpoint missing: $checkpoint"
    return
  }
  $marker = Join-Path $runtime '.ttb-runtime-v1'
  if ((Test-Path -LiteralPath $python) -and (Test-Path -LiteralPath $marker)) { return }
  if ($DryRun) {
    Write-Host "[vision] [dry-run] Would check or install the local CPU detector environment."
    return
  }

  try {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    $lockPath = Join-Path $directory 'setup.lock'
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::Write, [IO.FileShare]::None)
  } catch {
    Write-Warning "[vision] Could not open the detector setup directory. $($_.Exception.Message)"
    return
  }
  try {
    if (Test-Path -LiteralPath $python) {
      & $python -c 'import importlib.util as u, sys; sys.exit(not all(u.find_spec(m) for m in ("torch", "torchvision", "rfdetr", "supervision")))' 2>$null
      if ($LASTEXITCODE -eq 0) {
        New-Item -ItemType File -Force -Path $marker | Out-Null
        return
      }
    } else {
      $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
      if ($launcher) {
        & $launcher.Source -3 -m venv $runtime
      } else {
        $systemPython = Get-Command python.exe -ErrorAction SilentlyContinue
        if (-not $systemPython -or $systemPython.Source -like '*\WindowsApps\*') {
          Write-Warning "[vision] Python 3 is required to prepare the local detector."
          return
        }
        & $systemPython.Source -m venv $runtime
      }
      if ($LASTEXITCODE -ne 0) { throw 'Creating the Python environment failed.' }
    }

    Write-Host "[vision] Installing the local CPU detector environment (first start only) ..."
    & $python -m pip --disable-pip-version-check install torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cpu
    if ($LASTEXITCODE -ne 0) { throw 'Installing PyTorch failed.' }
    & $python -m pip --disable-pip-version-check install rfdetr==1.12.1 supervision==0.32.0
    if ($LASTEXITCODE -ne 0) { throw 'Installing RF-DETR failed.' }
    New-Item -ItemType File -Force -Path $marker | Out-Null
  } catch {
    Write-Warning "[vision] $($_.Exception.Message) TT-Beamer will still start."
  } finally {
    $lock.Dispose()
  }
}
