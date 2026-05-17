@echo off
REM start.bat - TT-Beamer click-and-run entry for Windows.
REM Thin wrapper that invokes start.ps1 via PowerShell with ExecutionPolicy
REM bypassed for this single command. (Doesn't change system policy.)
REM
REM Originally Phase 45. See start.ps1 for boot logic and Ctrl+C handling.

setlocal

REM ---------------------------------------------------------------
REM Phase 49 gap-closure-2: clear inherited env vars that affect
REM Chrome's headless mode. If the operator's PowerShell session has
REM $env:SSR_WIN_HEADLESS = "0" set from prior debugging, it
REM propagates through ./start.bat -> start.ps1 -> node -> chrome and
REM forces headful mode, producing chrome-UI overhead and y-axis
REM desync on /output/. Clear it here so both invocation paths
REM (double-click + ./start.bat) behave identically. Operators who
REM need the escape hatch should set it persistently via
REM [Environment]::SetEnvironmentVariable("SSR_WIN_HEADLESS","0","User").
REM ---------------------------------------------------------------
set "SSR_WIN_HEADLESS="

REM ---------------------------------------------------------------
REM Phase 49 gap-closure-1 + gap-closure-2: self-detach into a fresh
REM explorer-parented cmd window when invoked from a non-explorer
REM shell (PowerShell, Windows Terminal, an existing cmd, etc.).
REM
REM IMPORTANT — use PowerShell Start-Process (not cmd's `start`) to
REM truly detach. In modern ConPTY environments (Windows Terminal,
REM VS Code terminal), `start cmd /k` does NOT actually create
REM independent stdio handles — the spawned cmd's stdout still pipes
REM back to the parent ConPTY, so the original shell sees ALL output
REM duplicated. PowerShell's Start-Process creates a process with
REM fresh handles and an isolated console.
REM ---------------------------------------------------------------

if defined _TTB_SELF_SPAWNED goto :ttb_main

REM Walk one level: my parent is cmd (running this .bat). I want cmd's
REM PARENT to decide invocation context (grandparent of the powershell
REM oneliner). If grandparent == "explorer" -> double-click path,
REM continue inline. Otherwise self-detach.
for /f "tokens=*" %%P in ('powershell.exe -NoProfile -Command "try { $myProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID); $cmdParentId = $myProc.ParentProcessId; $grandProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cmdParentId); $grandPid = $grandProc.ParentProcessId; (Get-Process -Id $grandPid -ErrorAction SilentlyContinue).ProcessName } catch { 'unknown' }"') do set "_TTB_CMD_GRANDPARENT=%%P"

if /i "%_TTB_CMD_GRANDPARENT%"=="explorer" goto :ttb_main

REM Non-explorer shell detected — self-detach using PowerShell
REM Start-Process so the new console has truly independent handles.
echo.
echo [start.bat] Detected invocation from "%_TTB_CMD_GRANDPARENT%".
echo [start.bat] Launching detached console window (your shell stays free).
echo [start.bat] Server output will appear ONLY in the new window.
echo.

REM Use Start-Process with explicit -WindowStyle Normal and the
REM _TTB_SELF_SPAWNED env var threaded through a cmd /k preamble.
REM The child has no stdio inheritance from this cmd.
powershell.exe -NoProfile -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k', 'set _TTB_SELF_SPAWNED=1 ^&^& set SSR_WIN_HEADLESS= ^&^& \"%~dpnx0\" %*' -WorkingDirectory '%~dp0' -WindowStyle Normal"
endlocal & exit /b 0

:ttb_main

REM Phase 47 gap-closure-12: switch the console to UTF-8 so multi-byte
REM characters from Node.js / mediasoup log output (em-dash, arrows,
REM ellipsis) render correctly instead of as "â€"" / "â†'" / "â€¦". The
REM redirect silences the "Active code page: 65001" status line.
chcp 65001 >nul 2>&1

REM Resolve the directory this .bat lives in.
set "SCRIPTDIR=%~dp0"

REM Pass through CLI args to start.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTDIR%start.ps1" %*

endlocal & exit /b %ERRORLEVEL%
