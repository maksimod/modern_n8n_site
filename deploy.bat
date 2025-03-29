@echo off
echo Starting deployment of Video Courses Platform...

REM Check for Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed.
    exit /b 1
)

REM Check for Docker Compose
where docker-compose >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker Compose is not installed.
    exit /b 1
)

REM Build images
echo Building Docker images...
docker-compose build

REM Stop existing containers
echo Stopping existing containers if running...
docker-compose down --remove-orphans

REM Start containers
echo Starting containers...
docker-compose up -d

REM Wait for containers to be ready
echo Waiting for containers to be ready...
timeout /t 5 /nobreak >nul

REM Check containers status
echo Checking container status:
docker-compose ps

REM Get container IPs
FOR /F "tokens=*" %%i IN ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" video-platform-client') DO SET CLIENT_IP=%%i
FOR /F "tokens=*" %%i IN ('docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" video-platform-server') DO SET SERVER_IP=%%i

echo === Deployment Completed Successfully ===
echo Client is running at: http://localhost
echo Server API is running at: http://localhost:5000
echo Client container IP: %CLIENT_IP%
echo Server container IP: %SERVER_IP%
echo Data is persisted in Docker volumes: video-data and db-data

echo To deploy on another server:
echo 1. Save the images: docker save -o video-platform-images.tar video-platform-client video-platform-server
echo 2. Transfer the file to the new server
echo 3. On the new server: docker load -i video-platform-images.tar
echo 4. Run: docker-compose up -d 