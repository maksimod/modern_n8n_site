# Video Courses Platform

Платформа для видеокурсов с возможностью загрузки и просмотра видео

## Требования

- Docker
- Docker Compose

Если у вас не установлены Docker и Docker Compose, следуйте инструкциям в файле [INSTALL_DOCKER.md](./INSTALL_DOCKER.md).

## Развертывание приложения

### Шаг 1: Клонирование репозитория

```bash
git clone <URL_репозитория>
cd video-courses-platform
```

### Шаг 2: Настройка переменных окружения

Отредактируйте файл `.env` в директории `server`:

```bash
nano server/.env
```

### Шаг 3: Запуск приложения

Сделайте скрипт развертывания исполняемым и запустите его:

```bash
chmod +x deploy.sh
./deploy.sh
```

После успешного запуска приложение будет доступно по адресу http://localhost или http://IP_вашего_сервера.

## Структура директорий

- `client/` - исходный код фронтенда (React)
- `server/` - исходный код бэкенда (Node.js/Express)
- `video-data/` - директория для хранения загруженных видео (bind mount)
- `db-data/` - директория для хранения данных БД (bind mount)

## Управление приложением

### Просмотр статуса контейнеров

```bash
docker-compose ps
```

### Просмотр логов

```bash
# Просмотр логов сервера
docker-compose logs server

# Просмотр логов клиента
docker-compose logs client

# Просмотр логов в режиме реального времени
docker-compose logs -f
```

### Остановка приложения

```bash
docker-compose down
```

### Перезапуск приложения

```bash
docker-compose restart
```

### Обновление приложения

Если вы внесли изменения в код:

```bash
# Остановка приложения
docker-compose down

# Пересборка и запуск
docker-compose up --build -d
```

## Резервное копирование и восстановление

### Резервное копирование директорий с данными

```bash
# Создаем архив с видео
tar -czvf video-backup.tar.gz video-data/

# Создаем архив с данными БД
tar -czvf db-backup.tar.gz db-data/
```

### Восстановление данных из резервной копии

```bash
# Останавливаем приложение
docker-compose down

# Распаковываем архивы с резервными копиями
tar -xzvf video-backup.tar.gz
tar -xzvf db-backup.tar.gz

# Запускаем приложение
docker-compose up -d
```