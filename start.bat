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
REM Phase 49 gap-closure-3: self-detach into a fresh explorer-parented
REM cmd window when invoked from a non-explorer shell, via a temp
REM dispatcher .bat. Direct cross-shell quoting through cmd-batch ->
REM PowerShell -> Start-Process -> cmd /k breaks for non-trivial
REM command strings (carets stripped, backslash-escapes mis-parsed by
REM cmd /k). The dispatcher side-steps quoting entirely: we write a
REM tiny one-shot .bat to %TEMP%, then Start-Process invokes cmd /k
REM with just the dispatcher path. The dispatcher sets env vars and
REM calls back into start.bat with _TTB_SELF_SPAWNED=1, then deletes
REM itself.
REM
REM Why PowerShell Start-Process (not cmd's `start`): under modern
REM ConPTY hosts (Windows Terminal, VS Code terminal), `start cmd /k`
REM does NOT actually create independent stdio. Spawned cmd's stdout
REM still pipes back to the parent ConPTY -> output duplicated in
REM both windows. PS Start-Process creates a process with truly fresh
REM handles and an isolated console.
REM ---------------------------------------------------------------

if defined _TTB_SELF_SPAWNED goto :ttb_main

REM Walk one level: my parent is cmd (running this .bat). I want cmd's
REM PARENT (grandparent of the powershell oneliner) to decide invocation
REM context. If grandparent == "explorer" -> double-click path, continue
REM inline. Otherwise self-detach.
for /f "tokens=*" %%P in ('powershell.exe -NoProfile -Command "try { $myProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID); $cmdParentId = $myProc.ParentProcessId; $grandProc = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cmdParentId); $grandPid = $grandProc.ParentProcessId; (Get-Process -Id $grandPid -ErrorAction SilentlyContinue).ProcessName } catch { 'unknown' }"') do set "_TTB_CMD_GRANDPARENT=%%P"

if /i "%_TTB_CMD_GRANDPARENT%"=="explorer" goto :ttb_main

REM Non-explorer shell detected — write temp dispatcher then detach.
set "_TTB_DISPATCHER=%TEMP%\ttb-spawn-%RANDOM%%RANDOM%.bat"
set "_TTB_ORIG_BAT=%~dpnx0"

(
  echo @echo off
  echo set _TTB_SELF_SPAWNED=1
  echo set SSR_WIN_HEADLESS=
  echo call "%_TTB_ORIG_BAT%" %*
  echo set _RC=%%ERRORLEVEL%%
  echo del "%%~f0" ^>nul 2^>^&1
  echo exit /b %%_RC%%
) > "%_TTB_DISPATCHER%"

echo.
echo [start.bat] Detected invocation from "%_TTB_CMD_GRANDPARENT%".
echo [start.bat] Launching detached console window (your shell stays free).
echo [start.bat] Server output will appear ONLY in the new window.
echo.

REM Detach via PowerShell Start-Process so stdio is truly independent
REM from the calling ConPTY. cmd /k receives a single quoted path arg
REM (the dispatcher) — no nested quoting, no caret-escape gymnastics.
powershell.exe -NoProfile -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k','%_TTB_DISPATCHER%' -WorkingDirectory '%~dp0' -WindowStyle Normal"

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
