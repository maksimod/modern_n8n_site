# Установка Docker и Docker Compose

## Установка Docker на Ubuntu

```bash
# Обновление пакетов
sudo apt-get update

# Установка необходимых пакетов
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление Docker GPG ключа
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Добавление репозитория Docker
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Обновление пакетов
sudo apt-get update

# Установка Docker
sudo apt-get install -y docker-ce

# Добавление текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Применение изменений группы (или можно перелогиниться)
newgrp docker
```

## Установка Docker Compose на Ubuntu

```bash
# Загрузка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Установка прав на запуск
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker-compose --version
```

## Установка Docker на Windows

1. Скачайте и установите Docker Desktop с официального сайта: https://www.docker.com/products/docker-desktop/
2. Следуйте инструкциям установщика
3. После установки перезагрузите компьютер
4. Docker Compose включен в Docker Desktop для Windows

## Установка Docker на MacOS

1. Скачайте и установите Docker Desktop с официального сайта: https://www.docker.com/products/docker-desktop/
2. Следуйте инструкциям установщика
3. Docker Compose включен в Docker Desktop для Mac