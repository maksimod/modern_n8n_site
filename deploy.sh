#!/bin/bash

# Проверка наличия Docker и Docker Compose
if ! [ -x "$(command -v docker)" ]; then
  echo 'Ошибка: Docker не установлен.' >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Ошибка: Docker Compose не установлен.' >&2
  exit 1
fi

# Создание директорий для хранения данных
mkdir -p video-data
mkdir -p db-data

# Проверка и настройка прав доступа
chmod -R 755 video-data
chmod -R 755 db-data

# Остановка только контейнеров нашего приложения, не затрагивая другие
echo "Останавливаем контейнеры видеокурсов, если они запущены..."
docker stop video-platform-client video-platform-server 2>/dev/null || true
docker rm video-platform-client video-platform-server 2>/dev/null || true

# Сборка и запуск контейнеров
echo "Собираем и запускаем новые контейнеры..."
docker-compose up --build -d

# Проверка статуса
echo "Проверка статуса контейнеров:"
docker-compose ps

echo "Развертывание завершено! Приложение доступно на http://localhost:4000"
echo "API доступно на http://localhost:4001"
echo "Видео хранятся в директории: $(pwd)/video-data"
echo "Данные приложения хранятся в директории: $(pwd)/db-data"