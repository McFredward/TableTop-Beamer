@echo off
REM start.bat — TT-Beamer click-and-run entry for Windows.
REM Thin wrapper that invokes start.ps1 via PowerShell with ExecutionPolicy
REM bypassed for this single command. (Doesn't change system policy.)
REM
REM Phase 47 gap-closure (2026-05-17): stripped the "if EXITCODE != 0 pause"
REM block. The pause was triggering the cmd.exe "Terminate batch job (Y/N)?"
REM prompt path on Ctrl+C — operator feedback explicitly rejected that.
REM start.ps1 handles its own cleanup on Ctrl+C (kills parent cmd before
REM PowerShell exits, so cmd never reaches a Y/N prompt). Real start errors
REM stay visible in the cmd window because the window doesn't auto-close
REM until the user clicks X.
REM
REM Originally Phase 45.

setlocal

REM Resolve the directory this .bat lives in.
set "SCRIPTDIR=%~dp0"

REM Pass through CLI args to start.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTDIR%start.ps1" %*

endlocal & exit /b %ERRORLEVEL%
