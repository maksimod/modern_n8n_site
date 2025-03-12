# Инструкция по развертыванию на сервере с изменёнными портами

Эта инструкция поможет вам развернуть ваше приложение на удаленном сервере, используя порты 4000 (фронтенд) и 4001 (бэкенд).

## Предварительные требования

1. Сервер с Ubuntu 20.04 или более новой версией
2. SSH доступ к серверу
3. Установленные Docker и Docker Compose на сервере
4. Не должно быть других сервисов, использующих порты 4000 и 4001

## Шаг 1: Копирование проекта на сервер

### Вариант 1: Использование Git

Если у вас есть репозиторий Git:

```bash
# Создаем отдельную директорию для нового проекта
mkdir -p ~/video-courses-platform
cd ~/video-courses-platform

# Клонируем репозиторий
git clone <url_вашего_репозитория> .
```

### Вариант 2: Копирование через SCP

Если вы работаете локально и хотите скопировать файлы на сервер через SCP:

```bash
# Выполните эту команду на вашем локальном компьютере, НЕ на сервере
scp -r ./video-courses-platform username@your_server_ip:~/video-courses-platform
```

После копирования, подключитесь к серверу и перейдите в директорию проекта:

```bash
ssh username@your_server_ip
cd ~/video-courses-platform
```

## Шаг 2: Настройка переменных окружения

### Проверка файла .env для сервера

```bash
# Редактируем файл .env для сервера
nano server/.env
```

Убедитесь, что порт в настройках сервера установлен на 5000 (внутренний порт контейнера):

```
PORT=5000
JWT_SECRET=Замените_на_сложный_секретный_ключ
```

Для сохранения изменений в nano: `Ctrl+O`, затем `Enter`, затем `Ctrl+X`.

### Проверка файла .env для клиента

```bash
# Редактируем файл .env для клиента
nano client/.env
```

Убедитесь, что API URL использует порт 4001:

```
VITE_API_URL=http://localhost:4001
```

## Шаг 3: Запуск приложения

```bash
# Делаем скрипт развертывания исполняемым
chmod +x deploy.sh

# Запускаем скрипт развертывания
./deploy.sh
```

После успешного запуска ваше приложение должно быть доступно на:
- Фронтенд: http://ваш_ip:4000
- Бэкенд API: http://ваш_ip:4001

## Шаг 4: Проверка работы приложения

```bash
# Проверяем, что контейнеры запущены
docker ps

# Проверяем, что порты 4000 и 4001 прослушиваются
netstat -tulpn | grep -E '4000|4001'
```

## Шаг 5: Мониторинг и обслуживание

### Просмотр логов

```bash
# Перейдите в директорию с проектом
cd ~/video-courses-platform

# Просмотр логов всех контейнеров
docker-compose logs

# Просмотр логов в реальном времени
docker-compose logs -f

# Просмотр логов только сервера
docker-compose logs server

# Просмотр логов только клиента
docker-compose logs client
```

### Перезапуск приложения

```bash
cd ~/video-courses-platform
docker-compose restart
```

### Остановка приложения

```bash
cd ~/video-courses-platform
docker-compose down
```

### Обновление приложения

Когда вам нужно обновить приложение:

1. Перейдите в директорию проекта:
   ```bash
   cd ~/video-courses-platform
   ```

2. Остановите только контейнеры этого приложения:
   ```bash
   docker stop video-platform-client video-platform-server
   docker rm video-platform-client video-platform-server
   ```

3. Если вы используете Git:
   ```bash
   git pull
   ```

   Если нет, скопируйте новые файлы через SCP.

4. Пересоберите и запустите контейнеры:
   ```bash
   docker-compose up --build -d
   ```

## Настройка автозапуска при перезагрузке сервера

Поскольку у вас уже есть systemd сервис для другого приложения, создадим отдельный сервис для этого приложения:

```bash
sudo nano /etc/systemd/system/video-courses-platform.service
```

Содержимое файла service:

```
[Unit]
Description=Video Courses Platform Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/username/video-courses-platform
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Замените `/home/username/video-courses-platform` на правильный путь к вашему проекту.

Активируйте и запустите сервис:

```bash
sudo systemctl enable video-courses-platform
sudo systemctl start video-courses-platform
```

Теперь при перезагрузке сервера оба ваших приложения будут запущены автоматически.

## Проверка конфликтов с другими сервисами

Если вы заметили конфликты с другими сервисами, выполните:

```bash
# Проверка, какие сервисы используют нужные нам порты
sudo lsof -i :4000
sudo lsof -i :4001
```

Если порты заняты другими сервисами, вы можете изменить порты в файле docker-compose.yml на другие свободные порты.