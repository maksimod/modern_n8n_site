   @echo off
   echo FROM node:19-alpine > server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo WORKDIR /app >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo RUN apk add --no-cache python3 make g++ >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo COPY package*.json ./ >> server\Dockerfile.new
   echo RUN npm install >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo COPY . . >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo RUN mkdir -p /app/data/videos >> server\Dockerfile.new
   echo RUN mkdir -p /app/data/db >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo ENV NODE_ENV=production >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo EXPOSE 5000 >> server\Dockerfile.new
   echo. >> server\Dockerfile.new
   echo CMD ["node", "index.js"] >> server\Dockerfile.new
   move /y server\Dockerfile.new server\Dockerfile