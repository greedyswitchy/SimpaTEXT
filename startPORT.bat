@echo off
title SimpaTEXT - Запуск сервера
echo =====================================
echo   Запуск сервера Ollama...
echo =====================================

:: Проверяем, не запущен ли уже
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] Сервер Ollama уже запущен
    pause
    exit /b
)

:: Запускаем сервер
start "" "%ProgramFiles%\Ollama\ollama.exe" serve
timeout /t 3 /nobreak >nul

:: Проверяем
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [✓] Сервер Ollama запущен
    echo Теперь расширение SimpaTEXT готово к работе
) else (
    echo [✗] Ошибка запуска сервера
)

pause