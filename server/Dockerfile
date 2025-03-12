FROM node:19-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Создаем директорию для хранения видео (если её нет)
RUN mkdir -p /app/data/videos

EXPOSE 5000

CMD ["npm", "start"]