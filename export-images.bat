@echo off
echo Exporting Video Courses Platform Docker images...

REM Check for Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed.
    exit /b 1
)

REM Make sure images exist
docker image inspect video-platform-client >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: video-platform-client image not found. Run deploy.bat first.
    exit /b 1
)

docker image inspect video-platform-server >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: video-platform-server image not found. Run deploy.bat first.
    exit /b 1
)

REM Create output directory if it doesn't exist
if not exist docker-export mkdir docker-export

REM Export the images
echo Saving images to docker-export\video-platform-images.tar...
docker save -o docker-export\video-platform-images.tar video-platform-client video-platform-server

REM Create a README file
echo # Video Courses Platform Docker Images > docker-export\README.md
echo. >> docker-export\README.md
echo This package contains Docker images for the Video Courses Platform. >> docker-export\README.md
echo. >> docker-export\README.md
echo ## Deployment Instructions >> docker-export\README.md
echo. >> docker-export\README.md
echo 1. Load the Docker images: >> docker-export\README.md
echo    ``` >> docker-export\README.md
echo    docker load -i video-platform-images.tar >> docker-export\README.md
echo    ``` >> docker-export\README.md
echo. >> docker-export\README.md
echo 2. Create a docker-compose.yml file with the following contents: >> docker-export\README.md
echo    ```yaml >> docker-export\README.md
echo    version: '3.8' >> docker-export\README.md
echo. >> docker-export\README.md
echo    services: >> docker-export\README.md
echo      client: >> docker-export\README.md
echo        image: video-platform-client >> docker-export\README.md
echo        container_name: video-platform-client >> docker-export\README.md
echo        restart: always >> docker-export\README.md
echo        ports: >> docker-export\README.md
echo          - "80:80" >> docker-export\README.md
echo        depends_on: >> docker-export\README.md
echo          - server >> docker-export\README.md
echo        networks: >> docker-export\README.md
echo          - app-network >> docker-export\README.md
echo. >> docker-export\README.md
echo      server: >> docker-export\README.md
echo        image: video-platform-server >> docker-export\README.md
echo        container_name: video-platform-server >> docker-export\README.md
echo        restart: always >> docker-export\README.md
echo        ports: >> docker-export\README.md
echo          - "5000:5000" >> docker-export\README.md
echo        volumes: >> docker-export\README.md
echo          - video-data:/app/data/videos >> docker-export\README.md
echo          - db-data:/app/data/db >> docker-export\README.md
echo        networks: >> docker-export\README.md
echo          - app-network >> docker-export\README.md
echo        environment: >> docker-export\README.md
echo          - DB_HOST=localhost >> docker-export\README.md
echo          - DB_PORT=5432 >> docker-export\README.md
echo          - DB_USER=postgres >> docker-export\README.md
echo          - DB_PASSWORD=your_password >> docker-export\README.md
echo          - DB_NAME=videocourses >> docker-export\README.md
echo          - JWT_SECRET=your_secret >> docker-export\README.md
echo          - PORT=5000 >> docker-export\README.md
echo. >> docker-export\README.md
echo    networks: >> docker-export\README.md
echo      app-network: >> docker-export\README.md
echo        driver: bridge >> docker-export\README.md
echo. >> docker-export\README.md
echo    volumes: >> docker-export\README.md
echo      video-data: >> docker-export\README.md
echo        driver: local >> docker-export\README.md
echo      db-data: >> docker-export\README.md
echo        driver: local >> docker-export\README.md
echo    ``` >> docker-export\README.md
echo. >> docker-export\README.md
echo 3. Run the containers: >> docker-export\README.md
echo    ``` >> docker-export\README.md
echo    docker-compose up -d >> docker-export\README.md
echo    ``` >> docker-export\README.md
echo. >> docker-export\README.md
echo 4. The application will be available at: >> docker-export\README.md
echo    - Web Interface: http://localhost >> docker-export\README.md
echo    - API: http://localhost:5000 >> docker-export\README.md

REM Create a deployment batch file
echo @echo off > docker-export\deploy-imported.bat
echo echo Deploying Video Courses Platform from imported images... >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo REM Check for Docker and Docker Compose >> docker-export\deploy-imported.bat
echo where docker ^>nul 2^>^&1 >> docker-export\deploy-imported.bat
echo if %%ERRORLEVEL%% NEQ 0 ( >> docker-export\deploy-imported.bat
echo     echo Error: Docker is not installed. >> docker-export\deploy-imported.bat
echo     exit /b 1 >> docker-export\deploy-imported.bat
echo ) >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo where docker-compose ^>nul 2^>^&1 >> docker-export\deploy-imported.bat
echo if %%ERRORLEVEL%% NEQ 0 ( >> docker-export\deploy-imported.bat
echo     echo Error: Docker Compose is not installed. >> docker-export\deploy-imported.bat
echo     exit /b 1 >> docker-export\deploy-imported.bat
echo ) >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo REM Check if images are loaded >> docker-export\deploy-imported.bat
echo docker image inspect video-platform-client ^>nul 2^>^&1 >> docker-export\deploy-imported.bat
echo if %%ERRORLEVEL%% NEQ 0 ( >> docker-export\deploy-imported.bat
echo     echo Loading Docker images... >> docker-export\deploy-imported.bat
echo     docker load -i video-platform-images.tar >> docker-export\deploy-imported.bat
echo ) >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo REM Start containers >> docker-export\deploy-imported.bat
echo echo Starting containers... >> docker-export\deploy-imported.bat
echo docker-compose up -d >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo REM Check containers status >> docker-export\deploy-imported.bat
echo echo Checking container status: >> docker-export\deploy-imported.bat
echo docker-compose ps >> docker-export\deploy-imported.bat
echo. >> docker-export\deploy-imported.bat
echo echo === Deployment Completed Successfully === >> docker-export\deploy-imported.bat
echo echo Client is running at: http://localhost >> docker-export\deploy-imported.bat
echo echo Server API is running at: http://localhost:5000 >> docker-export\deploy-imported.bat

REM Copy the docker-compose file
copy docker-compose.yml docker-export\

REM Create a zip file
echo Creating zip archive...
powershell -command "Compress-Archive -Path docker-export -DestinationPath video-platform-docker-package.zip -Force"

echo === Export Completed Successfully ===
echo Docker images exported to: docker-export\video-platform-images.tar
echo Deployment package created: video-platform-docker-package.zip
echo Transfer this zip file to deploy on another server 