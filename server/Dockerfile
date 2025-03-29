FROM node:19-alpine 
 
WORKDIR /app 
 
RUN apk add --no-cache python3 make g++ 
 
COPY package*.json ./ 
RUN npm install 
 
COPY . . 
 
RUN mkdir -p /app/data/videos 
RUN mkdir -p /app/data/db 
 
ENV NODE_ENV=production 
 
EXPOSE 5000 
 
CMD ["node", "index.js"] 
