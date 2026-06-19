@echo off
title SimpaTEXT - Остановка сервера
echo =====================================
echo   Остановка сервера Ollama...
echo =====================================

:: Завершаем процесс ollama.exe
taskkill /F /IM ollama.exe >nul 2>&1

:: Проверяем
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [✓] Сервер Ollama остановлен
    echo Расширение SimpaTEXT теперь не будет работать
) else (
    echo [✗] Ошибка остановки сервера
)

pause