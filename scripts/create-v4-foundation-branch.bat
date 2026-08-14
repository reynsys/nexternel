@echo off
REM Create V4 foundation branch in the GitHub export repo (not this edit folder).
set EXPORT_REPO=D:\ProjectS\DAMN-SmarT-HomE\nexternel
set BRANCH=v4.0.0-foundation

if not exist "%EXPORT_REPO%\.git" (
  echo Git repo not found at %EXPORT_REPO%
  echo Export first: D:\ProjectS\DAMN-SmarT-HomE\DAMN HomE\scripts\export-for-github.bat
  exit /b 1
)

cd /d "%EXPORT_REPO%"
git checkout -b %BRANCH%
if errorlevel 1 (
  echo Branch may already exist — try: git checkout %BRANCH%
  exit /b 1
)
echo Created branch %BRANCH% in %EXPORT_REPO%
echo Next: export-for-github.bat, commit, push origin
