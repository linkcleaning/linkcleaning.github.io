@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PHOTOS=%USERPROFILE%\Documents\블로그사진\오늘"
if not exist "%PHOTOS%" mkdir "%PHOTOS%"
echo 사진 폴더: %PHOTOS%
echo 비서실 오늘 블로그 초안 + 위 폴더 사진으로 네이버 블로그에 임시저장합니다. (발행은 안 함)
node naver-draft.mjs today "%PHOTOS%"
pause
