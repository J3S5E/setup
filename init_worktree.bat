
@echo off
setlocal enabledelayedexpansion

REM --- Validate input ---
if "%~1"=="" (
    echo Usage: init_worktree.bat branch/name
    exit /b 1
)

set BRANCH=%~1
set WT_DIR=.worktrees\%BRANCH%
set WT_DIR=%WT_DIR:/=\%

REM --- Detect default branch from origin/HEAD ---
for /f "delims=" %%a in ('git rev-parse --abbrev-ref origin/HEAD 2^>NUL') do (
    set DEFAULT_BRANCH=%%a
)

if "%DEFAULT_BRANCH%"=="" (
    echo ERROR: Could not detect default branch from origin/HEAD.
    exit /b 1
)

REM Strip "origin/"
set DEFAULT_BRANCH=%DEFAULT_BRANCH:origin/=%

echo Default branch detected: %DEFAULT_BRANCH%

REM --- Prevent creating a worktree for the default branch ---
if /i "%BRANCH%"=="%DEFAULT_BRANCH%" (
    echo ERROR: Cannot create a worktree for the default branch "%DEFAULT_BRANCH%".
    exit /b 1
)

REM --- Also prevent creating worktrees for main or master explicitly ---
if /i "%BRANCH%"=="main" (
    echo ERROR: Cannot create a worktree for 'main'.
    exit /b 1
)
if /i "%BRANCH%"=="master" (
    echo ERROR: Cannot create a worktree for 'master'.
    exit /b 1
)

REM --- Detect current branch ---
for /f "delims=" %%a in ('git rev-parse --abbrev-ref HEAD') do (
    set CURRENT_BRANCH=%%a
)

echo Current branch: %CURRENT_BRANCH%

REM --- Check if branch exists locally ---
git show-ref --verify --quiet refs/heads/%BRANCH%
set LOCAL_EXISTS=%ERRORLEVEL%

REM --- Check if branch exists remotely ---
git show-ref --verify --quiet refs/remotes/origin/%BRANCH%
set REMOTE_EXISTS=%ERRORLEVEL%


REM --- If branch does not exist locally or remotely, create it ---
if %LOCAL_EXISTS% neq 0 if %REMOTE_EXISTS% neq 0 (
    echo Branch "%BRANCH%" does not exist. Creating it from current branch "%CURRENT_BRANCH%"...

    REM Create the branch WITHOUT switching into it
    git branch "%BRANCH%" "%CURRENT_BRANCH%"
    if errorlevel 1 (
        echo ERROR: Failed to create branch "%BRANCH%".
        exit /b 1
    )
)


REM --- If currently on the target branch, switch to default branch ---
if /i "%CURRENT_BRANCH%"=="%BRANCH%" (
    echo You are currently on "%BRANCH%". Checking out "%DEFAULT_BRANCH%" first...
    git checkout "%DEFAULT_BRANCH%"
    if errorlevel 1 (
        echo ERROR: Failed to switch to default branch.
        exit /b 1
    )
)

REM --- Create directory structure ---
if not exist "%WT_DIR%" (
    mkdir "%WT_DIR%"
)

REM --- Create the worktree ---
echo Creating worktree at "%WT_DIR%" for branch "%BRANCH%"...
git worktree add "%WT_DIR%" "%BRANCH%"
if errorlevel 1 (
    echo ERROR: Failed to create worktree.
    exit /b 1
)

REM --- Symlink .env ---
if exist ".env" (
    if not exist "%WT_DIR%\.env" (
        mklink "%WT_DIR%\.env" "%CD%\.env"
        echo Linked .env
    )
)

REM --- Symlink node_modules ---
if exist "node_modules" (
    if not exist "%WT_DIR%\node_modules" (
        mklink /D "%WT_DIR%\node_modules" "%CD%\node_modules"
        echo Linked node_modules
    )
)

REM --- Run npm install if package.json exists ---
if exist "%WT_DIR%\package.json" (
    echo package.json found. Running npm install in "%WT_DIR%"...
    pushd "%WT_DIR%"
    npm install
    if errorlevel 1 (
        echo WARNING: npm install failed.
    )
    popd
)

echo Worktree initialized successfully.
endlocal
