@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] 필요한 도구 설치 중... (1~3분)
call npm install
echo [2/2] 크롬 연결 확인...
call npx playwright install chromium
echo.
echo 설치 끝! 이제 "2_네이버로그인.bat" 을 두 번 눌러 주세요.
pause
