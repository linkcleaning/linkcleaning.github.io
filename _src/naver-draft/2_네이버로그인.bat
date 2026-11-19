@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 창이 뜨면 네이버에 직접 로그인하고, 다 되면 창을 닫아 주세요.
node naver-draft.mjs login
pause
