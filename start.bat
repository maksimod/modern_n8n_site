@echo off
echo Запуск Video Courses Platform...
echo.
echo [1/2] Установка зависимостей для клиента...
cd client
call npm install
echo.
echo [2/2] Запуск клиентской части...
call npm run dev