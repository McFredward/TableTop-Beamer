# start.ps1 - TT-Beamer click-and-run entry point (Windows 10/11 x64).
#
# Phase 45.
#
# Usage (normally invoked via start.bat):
#   .\start.ps1
#   .\start.ps1 -DryRun        # probe + report, do not download/install/start
#   $env:PORT=9000; .\start.ps1
#
# This script:
#   1. Resolves a portable Node.js into .node-portable\ (no admin needed).
#   2. Detects Chrome or Edge for the SSR tab. Bails clearly if neither found.
#   3. Resolves portable ffmpeg into ffmpeg-portable\ (no admin needed).
#   4. Runs `npm ci` if node_modules is stale. mediasoup >= 3.12 auto-pulls
#      a prebuilt mediasoup-worker.exe - no Visual Studio Build Tools needed.
#   5. Boots the server, waits for /api/health -> 200, opens dashboard.
#
# Stability principles: idempotent, defensive probes, no system mutation.

[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Phase 47 gap-closure-12: force UTF-8 output encoding so multi-byte
# characters in server log lines (em-dash, arrows, ellipsis) render as
# themselves instead of garbled Win-1252 sequences like "â€"" or "â†'".
# PS 5.1's [Console]::OutputEncoding defaults to the system codepage
# (Win-1252 on most en-DE locales). Pair with `chcp 65001` in start.bat.
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# -----------------------------------------------------------------------------
# Pre-flight: resolve project root, normalize cwd
# -----------------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -LiteralPath $ScriptDir

$Port          = if ($env:PORT) { $env:PORT } else { '4173' }
# Health probe + browser auto-open use 127.0.0.1 (explicit IPv4).
# Phase 47 gap-closure-2 (2026-05-17): on Windows, `localhost` resolves
# to `::1` (IPv6) FIRST (dual-stack default). Node's HTTP listener binds
# to `0.0.0.0` (IPv4-only — that's `HOST` in server.mjs line 41), so
# Invoke-WebRequest against `localhost` hangs / connection-refuses, making
# the "Waiting for server to come up" probe in start.ps1 never succeed
# even though the server IS up. Operator UAT 2026-05-17 reproduced this
# verbatim. Explicit `127.0.0.1` bypasses the DNS-resolution-order issue.
$HealthUrl         = "http://127.0.0.1:$Port/api/health"
$DashboardUrlLocal = "http://127.0.0.1:$Port/"

# LAN IP for the post-boot banner - dashboard/output are typically opened
# from a phone/tablet/Pi on the LAN, not on the server itself.
function Get-LanIp {
  try {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -notmatch '^127\.' -and
        $_.IPAddress -notmatch '^169\.254\.' -and
        $_.PrefixOrigin -ne 'WellKnown'
      } |
      Sort-Object -Property `
        @{Expression={$_.PrefixOrigin -eq 'Dhcp'}; Descending=$true}, `
        @{Expression={$_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*'}; Descending=$true}
    if ($candidates) {
      return ($candidates | Select-Object -First 1).IPAddress
    }
  } catch {}
  return 'localhost'
}
$LanIp        = Get-LanIp
$DashboardUrl = "http://${LanIp}:$Port/"
$OutputUrl    = "http://${LanIp}:$Port/output/"

$LogFile       = Join-Path $ScriptDir 'start.log'
$PidFile       = Join-Path $ScriptDir '.server.pid'

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
Write-Host (@'

   _____ _____   ____
  |_   _|_   _| | __ )  ___  __ _ _ __ ___   ___ _ __
    | |   | |   |  _ \ / _ \/ _` | '_ ` _ \ / _ \ '__|
    | |   | |   | |_) |  __/ (_| | | | | | |  __/ |
    |_|   |_|   |____/ \___|\__,_|_| |_| |_|\___|_|

   Click-and-run launcher (Windows)

'@)

if (-not (Test-Path -LiteralPath (Join-Path $ScriptDir 'package.json'))) {
  Write-Host "[start] ERROR: not in project root (no package.json found at $ScriptDir)" -ForegroundColor Red
  Write-Host "[start]   Run start.bat from the directory you cloned the repo into." -ForegroundColor Red
  exit 1
}

if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
  Write-Host "[start] ERROR: unsupported architecture: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor Red
  Write-Host "[start]   mediasoup ships prebuilts only for 64-bit Intel/AMD on Windows." -ForegroundColor Red
  Write-Host "[start]   See docs/INSTALL.md for ARM64 workarounds." -ForegroundColor Red
  exit 1
}

# -----------------------------------------------------------------------------
# Step 1 - portable Node.js
# -----------------------------------------------------------------------------
Write-Host "[start] (1/6) Portable Node.js ..."
. (Join-Path $ScriptDir 'scripts\bootstrap-node.ps1')

if ($DryRun) {
  $existingNode = Join-Path $script:PortableNodeDir 'node.exe'
  if (Test-Path -LiteralPath $existingNode) {
    Write-Host "[start]    [dry-run] Portable Node already present: $(& $existingNode --version)"
  } else {
    Write-Host "[start]    [dry-run] Portable Node would be downloaded from nodejs.org"
  }
} else {
  if (-not (Ensure-PortableNode)) {
    Write-Host "[start] ERROR: failed to bootstrap portable Node.js." -ForegroundColor Red
    exit 1
  }
}

# -----------------------------------------------------------------------------
# Step 2 - chromium (system Chrome or Edge)
# -----------------------------------------------------------------------------
Write-Host "[start] (2/6) Detecting Chromium ..."

function Resolve-Chromium {
  # Phase 46 iter11 (2026-05-17): WinPS 5.1 parser chokes on
  # ${env:ProgramFiles(x86)} inside double-quoted strings - the (x86)
  # parentheses get misinterpreted and the function body fails to
  # close, producing a cascading "Missing closing '}'" parser error
  # later in the file. Use Environment.GetEnvironmentVariable so the
  # name is a plain string literal, no fancy-variable parsing involved.
  $pfx86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$pfx86\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$pfx86\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

$chromiumPath = Resolve-Chromium
if (-not $chromiumPath) {
  Write-Host "[start] ERROR: no Chrome or Edge browser found." -ForegroundColor Red
  Write-Host "[start]   TT-Beamer's server-side renderer needs Chrome or Edge installed." -ForegroundColor Red
  Write-Host "[start]   Install one of these and re-run start.bat:" -ForegroundColor Red
  Write-Host "[start]     Chrome:  https://www.google.com/chrome/" -ForegroundColor Red
  Write-Host "[start]     Edge:    https://www.microsoft.com/edge" -ForegroundColor Red
  Write-Host "[start]   (Edge ships with Windows 10/11 by default - try reinstalling it" -ForegroundColor Red
  Write-Host "[start]    from the Microsoft Store if you've uninstalled it.)" -ForegroundColor Red
  exit 1
}
Write-Host "[start]    Using: $chromiumPath"
# SSR_BROWSER_BIN is the existing override read by ssr-browser-detect.mjs
# (priority 1 in detectChromiumBinary). Lets us skip Puppeteer's bundled
# Chromium and use the system browser instead.
$env:SSR_BROWSER_BIN = $chromiumPath
# Skip puppeteer's ~500 MB Chromium download during `npm ci` - we use
# system Chrome/Edge via SSR_BROWSER_BIN. Saves disk + first-run time.
$env:PUPPETEER_SKIP_DOWNLOAD = 'true'

# -----------------------------------------------------------------------------
# Step 3 - portable ffmpeg
# -----------------------------------------------------------------------------
Write-Host "[start] (3/6) Portable ffmpeg ..."

$FfmpegPortableDir = Join-Path $ScriptDir 'ffmpeg-portable'
$FfmpegExe = Join-Path $FfmpegPortableDir 'bin\ffmpeg.exe'
$FfmpegZipUrl = 'https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl-shared.zip'

function Ensure-PortableFfmpeg {
  if (Test-Path -LiteralPath $FfmpegExe) {
    Write-Host "[start]    Reusing portable ffmpeg at $FfmpegExe"
    return $true
  }

  $dl = "$FfmpegPortableDir.dl"
  New-Item -ItemType Directory -Force -Path $dl | Out-Null
  $zip = Join-Path $dl 'ffmpeg.zip'

  Write-Host "[start]    Downloading ffmpeg (~92 MB) from BtbN/FFmpeg-Builds ..."
  try {
    Invoke-WebRequest -Uri $FfmpegZipUrl -OutFile $zip -UseBasicParsing
  } catch {
    Write-Host "[start] ERROR: ffmpeg download failed." -ForegroundColor Red
    Write-Host "[start]   $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force -LiteralPath $dl -ErrorAction SilentlyContinue
    return $false
  }

  Write-Host "[start]    Extracting ..."
  $extract = Join-Path $dl 'extract'
  Remove-Item -Recurse -Force -LiteralPath $extract -ErrorAction SilentlyContinue
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force

  $top = Get-ChildItem -LiteralPath $extract -Directory | Select-Object -First 1
  if (-not $top) {
    Write-Host "[start] ERROR: unexpected ffmpeg archive layout" -ForegroundColor Red
    Remove-Item -Recurse -Force -LiteralPath $dl -ErrorAction SilentlyContinue
    return $false
  }
  Remove-Item -Recurse -Force -LiteralPath $FfmpegPortableDir -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $top.FullName -Destination $FfmpegPortableDir
  Remove-Item -Recurse -Force -LiteralPath $dl -ErrorAction SilentlyContinue

  if (-not (Test-Path -LiteralPath $FfmpegExe)) {
    Write-Host "[start] ERROR: ffmpeg.exe not found after extraction" -ForegroundColor Red
    return $false
  }
  Write-Host "[start]    ffmpeg installed at $FfmpegExe"
  return $true
}

if ($DryRun) {
  if (Test-Path -LiteralPath $FfmpegExe) {
    Write-Host "[start]    [dry-run] Portable ffmpeg already present."
  } else {
    Write-Host "[start]    [dry-run] ffmpeg would be downloaded from BtbN/FFmpeg-Builds."
  }
} else {
  if (-not (Ensure-PortableFfmpeg)) { exit 1 }
}
# Prepend ffmpeg-portable\bin to PATH so whichBinary("ffmpeg") in
# ssr-environment-bootstrap.mjs finds it without code changes. Also expose
# FFMPEG_PATH for any code that wants an explicit path.
$ffmpegBin = Split-Path -Parent $FfmpegExe
$env:PATH = "$ffmpegBin;$env:PATH"
$env:FFMPEG_PATH = $FfmpegExe

# -----------------------------------------------------------------------------
# Step 4 - node_modules / npm ci
# -----------------------------------------------------------------------------
Write-Host "[start] (4/6) node_modules ..."

$InstallMarker = Join-Path $ScriptDir 'node_modules\.start-ps1-installed-snapshot'

function Test-NodeModulesStale {
  $nm = Join-Path $ScriptDir 'node_modules'
  if (-not (Test-Path -LiteralPath $nm)) { return $true }
  if (-not (Test-Path -LiteralPath $InstallMarker)) { return $true }
  $repoLock = Join-Path $ScriptDir 'package-lock.json'
  if (-not (Test-Path -LiteralPath $repoLock)) { return $false }
  $expected = (Get-Content -LiteralPath $InstallMarker -Raw).Trim()
  $actual   = (Get-FileHash -LiteralPath $repoLock -Algorithm SHA256).Hash
  return ($expected -ne $actual)
}

if (Test-NodeModulesStale) {
  if ($DryRun) {
    Write-Host "[start]    [dry-run] Would run: npm ci"
  } else {
    Write-Host "[start]    Running 'npm ci' (first run takes 1-2 minutes; mediasoup downloads prebuilt worker) ..."
    $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
    $npmCmd = Join-Path $script:NodePortableBin 'npm.cmd'
    & $npmCmd ci
    if ($LASTEXITCODE -ne 0) {
      Write-Host "[start] ERROR: 'npm ci' failed (exit $LASTEXITCODE)." -ForegroundColor Red
      Write-Host "[start]" -ForegroundColor Red
      Write-Host "[start]   If the error mentions 'mediasoup-worker' or 'prebuilt fetch failed':" -ForegroundColor Red
      Write-Host "[start]     1. Check your internet / corporate proxy settings." -ForegroundColor Red
      Write-Host "[start]     2. Or download the worker manually from" -ForegroundColor Red
      Write-Host "[start]        https://github.com/versatica/mediasoup/releases" -ForegroundColor Red
      Write-Host "[start]        and set MEDIASOUP_WORKER_BIN to its path." -ForegroundColor Red
      Write-Host "[start]" -ForegroundColor Red
      Write-Host "[start]   See docs/INSTALL.md -> 'Windows troubleshooting' for details." -ForegroundColor Red
      exit 1
    }
    # Record which package-lock.json hash this node_modules was built from.
    $repoLock = Join-Path $ScriptDir 'package-lock.json'
    $hash = (Get-FileHash -LiteralPath $repoLock -Algorithm SHA256).Hash
    Set-Content -LiteralPath $InstallMarker -Value $hash -NoNewline
  }
} else {
  Write-Host "[start]    node_modules up-to-date."
}

# -----------------------------------------------------------------------------
# Step 5 - boot server
# -----------------------------------------------------------------------------
Write-Host "[start] (5/6) Boot server ..."

function Stop-ServerProcess {
  if (Test-Path -LiteralPath $PidFile) {
    try {
      $pidVal = [int](Get-Content -LiteralPath $PidFile)
      $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
      if ($proc) {
        Write-Host "[start] Stopping server (PID $pidVal) ..."
        # taskkill /T kills the whole process tree (node + its puppeteer-spawned
        # chrome.exe + mediasoup-worker.exe) in one shot. Belt + suspenders
        # with the Job Object below; some Windows/PS combos miss one or the
        # other, so we do both.
        & taskkill.exe /F /T /PID $pidVal 2>$null | Out-Null
        if (Get-Process -Id $pidVal -ErrorAction SilentlyContinue) {
          Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
        }
      }
    } catch {}
    Remove-Item -Force -LiteralPath $PidFile -ErrorAction SilentlyContinue
  }
}

# Phase 47 gap-closure (2026-05-17): walk the ancestor chain and capture
# every cmd.exe between us and the user's interactive shell so the Ctrl+C
# handler below can kill them all before exit. Without this, cmd.exe
# shows "Terminate batch job (Y/N)?" after PowerShell exits and waits for
# the operator to type Y. Operator UAT feedback was explicit: "bei STRG+C
# (abort) sofort beendet und nicht noch nachfragt".
#
# gap-closure-10: earlier revisions captured only the direct parent via
# Get-CimInstance, which silently failed on some configs (operator UAT
# 2026-05-17 confirmed the prompt still appeared). Now we try CIM, WMI,
# and wmic.exe in order, and we walk the whole chain so a cmd grandparent
# (e.g. nested cmd -> powershell -> cmd -> powershell) is also killed.
function Get-ParentProcessId {
  param([int]$ChildPid)
  try {
    $info = Get-CimInstance Win32_Process -Filter "ProcessId=$ChildPid" -ErrorAction Stop
    if ($info -and $info.ParentProcessId) { return [int]$info.ParentProcessId }
  } catch {}
  try {
    $info = Get-WmiObject Win32_Process -Filter "ProcessId=$ChildPid" -ErrorAction Stop
    if ($info -and $info.ParentProcessId) { return [int]$info.ParentProcessId }
  } catch {}
  try {
    $out = & wmic.exe process where "ProcessId=$ChildPid" get ParentProcessId 2>$null
    foreach ($line in $out) {
      $trimmed = "$line".Trim()
      if ($trimmed -match '^\d+$') { return [int]$trimmed }
    }
  } catch {}
  return 0
}

$script:AncestorCmdPids = @()
try {
  $cursor = $PID
  # Cap the walk at 8 hops so a broken parent chain can't infinite-loop.
  for ($hop = 0; $hop -lt 8; $hop++) {
    $parent = Get-ParentProcessId -ChildPid $cursor
    if (-not $parent -or $parent -le 0) { break }
    $parentProc = Get-Process -Id $parent -ErrorAction SilentlyContinue
    if (-not $parentProc) { break }
    $name = $parentProc.ProcessName
    if ($name -eq 'cmd') {
      $script:AncestorCmdPids += $parent
    } elseif ($name -ne 'powershell' -and $name -ne 'pwsh') {
      # Stop walking once we leave the cmd/powershell chain (e.g. reached
      # explorer.exe or the user's interactive shell host). Killing those
      # would close the operator's session.
      break
    }
    $cursor = $parent
  }
} catch {}

# Phase 49 (item 49-A, 2026-05-17): detect invocation context to decide
# whether the Ctrl+C handler is allowed to kill ancestor cmd.exe.
#
# Two operator workflows:
#   (a) Double-click start.bat from Explorer  -> parent is a wegwerf
#       cmd.exe spawned BY explorer.exe. We WANT to kill that cmd on Ctrl+C
#       (Phase 47 gap-closure-13 behavior — otherwise cmd shows
#       "Terminate batch job (Y/N)?" and waits for user input).
#   (b) Operator types ./start.bat in an existing PowerShell/cmd session
#       -> parent is the operator's WORKING shell (or a cmd transient that
#       ultimately reports back to that working shell). Killing it would
#       close the operator's session and lose unsaved work in their other
#       editor tabs / consoles.
#
# Detection: walk the topmost contiguous cmd ancestor and look at ITS
# parent. If that grandparent is explorer.exe -> 'fresh-cmd'. Anything
# else (powershell.exe, pwsh.exe, WindowsTerminal.exe, conhost.exe with no
# explorer above, walk truncates, CIM/WMI all fail) -> 'existing-shell'.
#
# Safety bias: default to 'existing-shell' on any uncertainty. False-negative
# cost = one batch-prompt on a wegwerf window (recoverable). False-positive
# cost = operator's working shell gets force-killed (data loss). Always
# lean safe.
$script:InvocationContext = 'existing-shell'
try {
  if ($script:AncestorCmdPids.Count -gt 0) {
    # Topmost cmd in our captured ancestor chain.
    $topCmdPid = $script:AncestorCmdPids[-1]
    $topCmdParent = Get-ParentProcessId -ChildPid $topCmdPid
    if ($topCmdParent -gt 0) {
      $topCmdParentProc = Get-Process -Id $topCmdParent -ErrorAction SilentlyContinue
      if ($topCmdParentProc -and $topCmdParentProc.ProcessName -eq 'explorer') {
        $script:InvocationContext = 'fresh-cmd'
      }
    }
  }
} catch {
  # Stay 'existing-shell' on any error - safer.
}
Write-Host "[start]    Invocation context: $script:InvocationContext (ancestor cmds: $($script:AncestorCmdPids.Count))"

if ($DryRun) {
  Write-Host "[start]    [dry-run] Would launch: node server.mjs (port $Port)"
  Write-Host "[start]    [dry-run] All probes passed. Re-run without -DryRun to start."
  exit 0
}

# Stop any orphan from a previous run.
Stop-ServerProcess

# Phase 47 gap-closure-7 (2026-05-17): foreign-process port-blocker preflight
# with automatic port-shift.
#
# Symptom (operator UAT, Win11): start.bat hangs at "Waiting for server to
# come up" forever. Server-side diagnostics proved Node was listening +
# event-loop alive, but curl http://127.0.0.1:$Port/api/health got no
# response. netstat revealed TWO LISTEN sockets on $Port - ours on
# 0.0.0.0 AND a foreign process on 127.0.0.1 (in the reported case:
# Code.exe / VS Code's port-forwarding feature, $Port=4173 happens to be
# Vite's default preview port). Windows routes 127.0.0.1 traffic to the
# more-specific bind, so every probe hit the squatter who accepts TCP
# but never speaks HTTP.
#
# Strategy: when a foreign process holds $Port, leave it alone (no kill;
# the operator's editor/dev tooling stays running) and auto-shift to the
# next free port. URLs derived from $Port are recomputed in place.
function Test-PortBlockers {
  param([int]$ProbePort)
  try {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $ProbePort -ErrorAction SilentlyContinue
  } catch {
    # PS 5.1 on stripped-down Windows installs may lack Get-NetTCPConnection;
    # fall back to netstat parsing.
    $conns = $null
    try {
      $lines = & netstat.exe -ano 2>$null | Select-String -Pattern "LISTENING" | Select-String -Pattern ":$ProbePort\s"
      $conns = foreach ($ln in $lines) {
        $parts = ($ln.ToString() -split '\s+') | Where-Object { $_ -ne '' }
        # Columns: Proto LocalAddr ForeignAddr State PID
        if ($parts.Count -ge 5) {
          $localAddr = $parts[1]
          $owningPid = [int]$parts[4]
          [pscustomobject]@{
            LocalAddress  = ($localAddr -replace ":\d+$","")
            LocalPort     = $ProbePort
            OwningProcess = $owningPid
          }
        }
      }
    } catch {}
  }
  # IMPORTANT: filter $null. PowerShell's @($null) is an array of length 1
  # containing $null; without this filter, every "no blocker found" call
  # would falsely report Count=1 and the port-shift scan would never find
  # a free port.
  return @($conns | Where-Object { $null -ne $_ })
}

# Active bind probe. This is the DEFINITIVE test: try to bind a
# TcpListener on 127.0.0.1:$ProbePort. If another process is already
# listening on the same loopback address (e.g. VS Code's port-forwarder
# squatting 4173), the .Start() call throws EADDRINUSE. Returns $true if
# we successfully bound (port is free for our use), $false otherwise.
# Get-NetTCPConnection alone proved unreliable in operator testing
# (returned empty from start.ps1's context even though VS Code's
# listener was clearly present in netstat output).
function Test-PortBindable {
  param([int]$ProbePort)
  $listener = $null
  try {
    $loopback = [System.Net.IPAddress]::Loopback
    $listener = New-Object System.Net.Sockets.TcpListener($loopback, $ProbePort)
    $listener.Start()
    $listener.Stop()
    return $true
  } catch {
    if ($listener -ne $null) {
      try { $listener.Stop() } catch { }
    }
    return $false
  }
}

if (-not (Test-PortBindable -ProbePort $Port)) {
  Write-Host ""
  Write-Host "[start] WARNING: port $Port is already in use - shifting to a free port." -ForegroundColor Yellow
  Write-Host "[start]          (Without this, the dashboard probe would hang silently.)" -ForegroundColor Yellow
  # Best-effort: enumerate blockers via Get-NetTCPConnection / netstat for
  # informational display. Failure here is non-fatal because the
  # bind-probe already proved the port is blocked.
  $portBlockers = Test-PortBlockers -ProbePort $Port
  foreach ($conn in $portBlockers) {
    $blockingPid = [int]$conn.OwningProcess
    if ($blockingPid -le 0) { continue }
    $procName = '<unknown>'
    $procPath = ''
    try {
      $p = Get-Process -Id $blockingPid -ErrorAction SilentlyContinue
      if ($p) {
        $procName = $p.ProcessName
        try { $procPath = $p.MainModule.FileName } catch { $procPath = '' }
      }
    } catch {}
    $pathSuffix = ''
    if ($procPath) { $pathSuffix = "  Path=$procPath" }
    $blockerLine = "[start]   Blocker on " + $conn.LocalAddress + ":" + $conn.LocalPort + "  PID=" + $blockingPid + "  Name=" + $procName + $pathSuffix
    Write-Host $blockerLine -ForegroundColor Yellow
  }

  # Probe upward for the next free port via the same active bind test.
  # Cap the scan so a fully-blocked ephemeral range surfaces as an error
  # instead of an infinite loop.
  $originalPort = [int]$Port
  $candidate    = $originalPort + 1
  $scanLimit    = $originalPort + 50
  $newPort      = 0
  while ($candidate -le $scanLimit) {
    if (Test-PortBindable -ProbePort $candidate) {
      $newPort = $candidate
      break
    }
    $candidate = $candidate + 1
  }

  if ($newPort -le 0) {
    Write-Host ("[start] FATAL: no free port found in range {0}-{1}. Aborting." -f ($originalPort + 1), $scanLimit) -ForegroundColor Red
    exit 1
  }

  $Port              = [string]$newPort
  $HealthUrl         = "http://127.0.0.1:$Port/api/health"
  $DashboardUrlLocal = "http://127.0.0.1:$Port/"
  $DashboardUrl      = "http://${LanIp}:$Port/"
  $OutputUrl         = "http://${LanIp}:$Port/output/"
  Write-Host ("[start]   -> shifted to free port {0}. Dashboard URLs updated." -f $Port) -ForegroundColor Green
}

# Truncate log so the user sees only this session's output.
"" | Set-Content -LiteralPath $LogFile

$env:PORT = $Port
$nodeExe = Join-Path $script:NodePortableBin 'node.exe'

Write-Host "[start]    Starting Node server (port $Port) ..."
# Phase 46 iter14 (2026-05-17): use -NoNewWindow so node inherits the
# script's console. Operator UAT: closing the launcher console left
# node.exe running as an orphan; its puppeteer-stream watchdog kept
# relaunching Chrome in a loop, "flooding the desktop with windows".
# With -NoNewWindow Windows sends CTRL_CLOSE_EVENT to the whole
# console-attached process tree on window-close, killing node cleanly.
# (-WindowStyle Hidden has no effect on a console app and conflicts
# with -NoNewWindow in some PS5.1 builds, so it's dropped.)
$proc = Start-Process -FilePath $nodeExe `
                       -ArgumentList 'server.mjs' `
                       -WorkingDirectory $ScriptDir `
                       -NoNewWindow `
                       -RedirectStandardOutput $LogFile `
                       -RedirectStandardError "$LogFile.err" `
                       -PassThru
"$($proc.Id)" | Set-Content -LiteralPath $PidFile

# Phase 49 (item 49-B, 2026-05-17): $cleanup defined BEFORE the Job Object
# / SetConsoleCtrlHandler registration so the CTRL_CLOSE_EVENT delegate
# below can capture it. Previously this lived just above the
# add_CancelKeyPress block (line ~587); relocated unchanged.
$cleanup = {
  Write-Host ""
  Write-Host "[start] Shutting down ..."
  Stop-ServerProcess
}

# Phase 46 iter14: best-effort Job Object so any subprocess node spawns
# (puppeteer-spawned chrome.exe, mediasoup-worker.exe) dies when node
# dies. Without this, Chrome instances launched by puppeteer-stream
# survive even after `Stop-Process node` if they reparent themselves.
# Falls through silently on platforms / PS versions where the API
# surface differs (CoreCLR, constrained-language).
#
# Phase 49 (item 49-B, 2026-05-17): TtbJob extended with
# ConsoleCtrlDelegate + SetConsoleCtrlHandler so CTRL_CLOSE_EVENT
# (X-button close, taskkill of cmd, log-off, shutdown) can trigger a
# graceful $cleanup pass BEFORE the kernel-side KILL_ON_JOB_CLOSE belt
# fires. KILL_ON_JOB_CLOSE (LimitFlags = 0x2000 below) was already shipped
# in Phase 47; the SetConsoleCtrlHandler addition is the missing
# user-mode hook that lets us log "[start] Shutting down ..." before the
# kernel-level reap.
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class TtbJob {
  [DllImport("kernel32.dll")] public static extern IntPtr CreateJobObject(IntPtr a, string name);
  [DllImport("kernel32.dll")] public static extern bool SetInformationJobObject(IntPtr j, int infoClass, IntPtr info, uint length);
  [DllImport("kernel32.dll")] public static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit;
    public uint LimitFlags; public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit; public long Affinity; public uint PriorityClass; public uint SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct IO_COUNTERS {
    public ulong ReadOperationCount; public ulong WriteOperationCount; public ulong OtherOperationCount;
    public ulong ReadTransferCount; public ulong WriteTransferCount; public ulong OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
  }
  public delegate bool ConsoleCtrlDelegate(uint ctrlType);
  [DllImport("kernel32.dll")] public static extern bool SetConsoleCtrlHandler(ConsoleCtrlDelegate handler, bool add);
}
'@ -ErrorAction SilentlyContinue
  $job = [TtbJob]::CreateJobObject([IntPtr]::Zero, $null)
  if ($job -ne [IntPtr]::Zero) {
    $info = New-Object TtbJob+JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    $info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    $size = [System.Runtime.InteropServices.Marshal]::SizeOf($info)
    $ptr = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($size)
    [System.Runtime.InteropServices.Marshal]::StructureToPtr($info, $ptr, $false)
    [void][TtbJob]::SetInformationJobObject($job, 9, $ptr, [uint32]$size)  # 9 = JobObjectExtendedLimitInformation
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
    [void][TtbJob]::AssignProcessToJobObject($job, $proc.Handle)
    $script:JobHandle = $job  # keep alive in script scope; closed implicitly on exit
  }
} catch {
  Write-Host "[start]    (job-object cleanup not available; using PID kill fallback only)"
}

# Phase 49 (item 49-B, 2026-05-17): register a SetConsoleCtrlHandler for
# CTRL_CLOSE_EVENT so the PowerShell-side $cleanup runs BEFORE the kernel
# hard-kill on window-close. The Job Object already has
# JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE (0x2000, see LimitFlags above), which
# guarantees node/chrome/mediasoup-worker are reaped on parent handle
# close - this handler adds a graceful shutdown window (~5 s on Windows)
# so we get a "[start] Shutting down ..." log line and Stop-ServerProcess
# gets its taskkill /T pass in. Belt + suspenders, not replacement.
#
# Lifetime: $script:CtrlHandlerDelegate keeps the delegate INSTANCE alive
# while Windows still holds the callback pointer. If we let .NET GC the
# delegate, the next CTRL_CLOSE_EVENT calls into freed memory and crashes
# the process. Stored in $script: scope so it survives until natural exit.
#
# Return value: return $false so Windows continues its default handler
# chain - which triggers the kernel-level KILL_ON_JOB_CLOSE on the Job
# Object as the safety net. Returning $true would stop dispatching and
# the KILL_ON_JOB_CLOSE belt would not fire.
try {
  $script:CtrlHandlerDelegate = [TtbJob+ConsoleCtrlDelegate]{
    param([uint32]$ctrlType)
    # 2 = CTRL_CLOSE_EVENT (X-button close, taskkill of cmd, etc.)
    # 5 = CTRL_LOGOFF_EVENT, 6 = CTRL_SHUTDOWN_EVENT (terminal-ish events)
    if ($ctrlType -eq 2 -or $ctrlType -eq 5 -or $ctrlType -eq 6) {
      try { & $cleanup } catch {}
    }
    return $false
  }
  [void][TtbJob]::SetConsoleCtrlHandler($script:CtrlHandlerDelegate, $true)
} catch {
  Write-Host "[start]    (CTRL_CLOSE_EVENT handler unavailable; relying on Job Object KILL_ON_JOB_CLOSE only)"
}

# Phase 46 iter13 (2026-05-17): PowerShell 5.1 doesn't accept
# `[Console]::CancelKeyPress += { ... }` as a way to subscribe to a
# .NET static event - PS rejects it with "The property 'CancelKeyPress'
# cannot be found on this object." Use the CLR-generated
# add_CancelKeyPress method instead, which works in both PS 5.1 and
# PS 7+. Falls back to the try/finally at the script bottom if event
# registration fails for any reason (e.g. constrained-language mode).
try {
  [Console]::add_CancelKeyPress({
    param($s,$e)
    # gap-closure-10: kill ancestor cmd.exe processes BEFORE running our
    # own cleanup, so cmd is already dead when our PowerShell exits.
    # If cleanup ran first, the few seconds spent taskkilling the node
    # tree gave cmd time to print "Terminate batch job (Y/N)?" once
    # PowerShell finally returned. Order matters: kill cmd, then
    # cleanup, then Exit.
    #
    # Phase 49 (item 49-A, 2026-05-17): only kill ancestor cmd in the
    # double-click path. In 'existing-shell' invocation the "ancestor"
    # IS the operator's working shell - killing it would close their
    # session and lose unsaved work in their other tabs. The Stop-
    # ServerProcess taskkill /T pass + Job Object KILL_ON_JOB_CLOSE
    # still reap node + descendants without touching the parent.
    $e.Cancel = $true
    if ($script:InvocationContext -eq 'fresh-cmd') {
      foreach ($cmdPid in $script:AncestorCmdPids) {
        try { Stop-Process -Id $cmdPid -Force -ErrorAction SilentlyContinue } catch {}
        try { & taskkill.exe /F /PID $cmdPid 2>$null | Out-Null } catch {}
      }
    }
    & $cleanup
    [System.Environment]::Exit(0)
  })
} catch {
  Write-Host "[start]    (Ctrl+C handler unavailable; close the window to stop the server.)"
}

# -----------------------------------------------------------------------------
# Step 6 - health probe + open browser
# -----------------------------------------------------------------------------
Write-Host "[start] (6/6) Waiting for server to come up ..."

function Probe-Health {
  param([int]$TimeoutSec = 90)
  $elapsed = 0
  $spinner = '|', '/', '-', '\'
  $i = 0
  while ($elapsed -lt $TimeoutSec) {
    try {
      $resp = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($resp.StatusCode -eq 200) {
        Write-Host ("`r[start]    Server is up (took {0}s).                       " -f $elapsed)
        return $true
      }
    } catch {}
    # Check if the server died.
    $serverProc = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
    if (-not $serverProc) {
      Write-Host ""
      Write-Host "[start] ERROR: server process died during startup." -ForegroundColor Red
      if (Test-Path -LiteralPath $LogFile) {
        Write-Host "[start]    Last 30 lines of ${LogFile}:" -ForegroundColor Red
        Get-Content -LiteralPath $LogFile -Tail 30 -Encoding UTF8 | ForEach-Object { Write-Host "    $_" }
      }
      return $false
    }
    $i = ($i + 1) % 4
    Write-Host -NoNewline ("`r[start]    {0} waiting ... {1}s" -f $spinner[$i], $elapsed)
    Start-Sleep -Seconds 1
    $elapsed++
  }
  Write-Host ""
  Write-Host "[start] ERROR: health probe timed out after ${TimeoutSec}s." -ForegroundColor Red
  return $false
}

if (-not (Probe-Health -TimeoutSec 90)) {
  & $cleanup
  exit 1
}

Write-Host "[start]    Opening dashboard ..."
Start-Process $DashboardUrlLocal

Write-Host ""
Write-Host "  -----------------------------------------------------"
Write-Host "  TT-Beamer is running."
Write-Host "    Dashboard (open on phone/tablet):  $DashboardUrl"
Write-Host "    Output view (open on the Pi):      $OutputUrl"
Write-Host "    Log:                                $LogFile"
Write-Host "  -----------------------------------------------------"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

# Phase 47 gap-closure-13: pre-emptively kill the ancestor cmd.exe(s)
# NOW, before the user can press Ctrl+C. The earlier handler-time kill
# was a race with cmd's own batch-prompt signal handler (and on some
# configs the AncestorCmdPids walk returned empty). Once cmd is dead,
# Ctrl+C goes directly to this PowerShell process — our CancelKeyPress
# handler runs and exits cleanly, no "Terminate batch job (Y/N)?"
# prompt because there's no batch job left to terminate.
#
# Done AFTER the success banner so the operator sees the dashboard
# URL/log path before cmd detaches. Done BEFORE Get-Content -Wait so
# any subsequent Ctrl+C lands in a cmd-free chain.
#
# Phase 49 (item 49-A, 2026-05-17): gated on $script:InvocationContext
# - only runs in 'fresh-cmd' (double-click) mode. In 'existing-shell'
# mode (./start.bat from a working PS/cmd session), we leave the parent
# shell ALONE and rely on Stop-ServerProcess + Job Object
# KILL_ON_JOB_CLOSE to reap node + descendants without touching the
# operator's session.
if ($script:InvocationContext -eq 'fresh-cmd') {
  foreach ($cmdPid in $script:AncestorCmdPids) {
    try { Stop-Process -Id $cmdPid -Force -ErrorAction SilentlyContinue } catch {}
    try { & taskkill.exe /F /PID $cmdPid 2>$null | Out-Null } catch {}
  }
}

# Block the foreground console; tail the log so the user sees server output.
# -Encoding UTF8 (gap-closure-13): Node writes UTF-8 bytes; PS 5.1's
# default Get-Content encoding is Win-1252 which renders em-dash /
# arrows / ellipsis as "â€"" / "â†'" / "â€¦".
try {
  Get-Content -LiteralPath $LogFile -Wait -Tail 0 -Encoding UTF8
} finally {
  & $cleanup
}
