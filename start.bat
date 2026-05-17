@echo off
REM start.bat - TT-Beamer click-and-run entry for Windows.
REM Thin wrapper that invokes start.ps1 via PowerShell with ExecutionPolicy
REM bypassed for this single command. (Doesn't change system policy.)
REM
REM Originally Phase 45. See start.ps1 for boot logic and Ctrl+C handling.

setlocal

REM ---------------------------------------------------------------
REM Phase 49 gap-closure-1: self-detach into a fresh explorer-parented
REM cmd window when invoked from a non-explorer shell (PowerShell,
REM Windows Terminal, an existing cmd, etc.). Reasons:
REM   1. Ctrl+C signal handling: PowerShell swallows Ctrl+C before it
REM      reaches child processes — start.ps1's CancelKeyPress handler
REM      never fires when the script tree is rooted in PS, so cleanup
REM      doesn't run.
REM   2. DPI awareness inheritance: Chrome's --headless=new computes
REM      its virtual-window size based on the inherited DPI awareness
REM      context. PowerShell / Windows Terminal pass a non-V2 context
REM      that causes Chrome to report 1920x956 instead of 1920x1080,
REM      producing a y-axis desync on /output/.
REM
REM Strategy: detect the cmd's parent process via a single PowerShell
REM oneliner. If parent is "explorer" (double-click path) or we're
REM already the self-spawned target (marker env var set), continue.
REM Otherwise re-launch via `start` so the new cmd is owned by a fresh
REM conhost with explorer-style DPI inheritance and an isolated
REM signal-handling group. The caller's shell stays free immediately.
REM ---------------------------------------------------------------

if defined _TTB_SELF_SPAWNED goto :ttb_main

REM Walk one level: my parent is cmd (running this .bat). I want cmd's
REM PARENT to decide invocation context. Use PowerShell CIM for the
REM lookup ($PID of the powershell oneliner = its own PID; parent =
REM cmd running .bat; grandparent = whoever started cmd).
for /f "tokens=*" %%P in ('powershell.exe -NoProfile -Command "try { $myProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID); $cmdParentId = $myProc.ParentProcessId; $grandProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cmdParentId); $grandPid = $grandProc.ParentProcessId; (Get-Process -Id $grandPid -ErrorAction SilentlyContinue).ProcessName } catch { 'unknown' }"') do set "_TTB_CMD_GRANDPARENT=%%P"

if /i "%_TTB_CMD_GRANDPARENT%"=="explorer" goto :ttb_main

REM Non-explorer shell detected — self-detach into a fresh window.
echo.
echo [start.bat] Detected invocation from "%_TTB_CMD_GRANDPARENT%".
echo [start.bat] Relaunching in a new console window for clean signal
echo [start.bat] handling and DPI inheritance. Your shell is now free.
echo.
set "_TTB_SELF_SPAWNED=1"
start "TT-Beamer" /D "%~dp0" cmd /k "set _TTB_SELF_SPAWNED=1 && %~dpnx0 %*"
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
