@echo off
REM start.bat — TT-Beamer click-and-run entry for Windows.
REM Thin wrapper that invokes start.ps1 via PowerShell with ExecutionPolicy
REM bypassed for this single command. (Doesn't change system policy.)
REM
REM Phase 45.

setlocal

REM Resolve the directory this .bat lives in.
set "SCRIPTDIR=%~dp0"

REM Pass through CLI args to start.ps1, plus user-friendly pause on error.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTDIR%start.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

if not "%EXITCODE%"=="0" (
  echo.
  echo Something went wrong. Exit code: %EXITCODE%
  echo See start.log for server output, or the messages above for setup errors.
  echo.
  pause
)

endlocal & exit /b %EXITCODE%
