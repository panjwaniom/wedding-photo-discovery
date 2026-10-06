@echo off
echo ========================================
echo Wedding Face Search - Setup
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env and add your Immich API key!
    echo Get it from: http://localhost:2283/user-settings - API Keys
    echo.
    pause
)

REM Check if API key is set (case-insensitive to match .env.example)
findstr /I /C:"replace_with_your_api_key" .env >nul 2>&1
if %errorlevel%==0 (
    echo WARNING: Your API key is not set yet!
    echo.
    echo 1. Open http://localhost:2283/user-settings
    echo 2. Go to API Keys
    echo 3. Create a new API key with all permissions
    echo 4. Edit .env and replace REPLACE_WITH_YOUR_API_KEY
    echo.
    pause
)

echo Building and starting Wedding Face Search...
echo.
docker compose up --build
