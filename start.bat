@echo off
REM start.bat - TT-Beamer click-and-run entry for Windows.
REM Thin wrapper that invokes start.ps1 via PowerShell with ExecutionPolicy
REM bypassed for this single command. (Doesn't change system policy.)
REM
REM Originally Phase 45. See start.ps1 for boot logic and Ctrl+C handling.

setlocal

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
