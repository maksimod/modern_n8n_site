#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Exporting Video Courses Platform Docker images...${NC}"

# Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: Docker is not installed.${NC}" >&2
  exit 1
fi

# Make sure images exist
if ! docker image inspect video-platform-client >/dev/null 2>&1; then
  echo -e "${RED}Error: video-platform-client image not found. Run deploy.sh first.${NC}" >&2
  exit 1
fi

if ! docker image inspect video-platform-server >/dev/null 2>&1; then
  echo -e "${RED}Error: video-platform-server image not found. Run deploy.sh first.${NC}" >&2
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p ./docker-export

# Export the images
echo -e "${YELLOW}Saving images to docker-export/video-platform-images.tar...${NC}"
docker save -o ./docker-export/video-platform-images.tar video-platform-client video-platform-server

# Create a README file
cat > ./docker-export/README.md << 'EOF'
# Video Courses Platform Docker Images

This package contains Docker images for the Video Courses Platform.

## Deployment Instructions

1. Load the Docker images:
   ```
   docker load -i video-platform-images.tar
   ```

2. Create a docker-compose.yml file with the following contents:
   ```yaml
   version: '3.8'

   services:
     client:
       image: video-platform-client
       container_name: video-platform-client
       restart: always
       ports:
         - "80:80"
       depends_on:
         - server
       networks:
         - app-network

     server:
       image: video-platform-server
       container_name: video-platform-server
       restart: always
       ports:
         - "5000:5000"
       volumes:
         - video-data:/app/data/videos
         - db-data:/app/data/db
       networks:
         - app-network
       environment:
         - DB_HOST=localhost
         - DB_PORT=5432
         - DB_USER=postgres
         - DB_PASSWORD=your_password
         - DB_NAME=videocourses
         - JWT_SECRET=your_secret
         - PORT=5000

   networks:
     app-network:
       driver: bridge

   volumes:
     video-data:
       driver: local
     db-data:
       driver: local
   ```

3. Run the containers:
   ```
   docker-compose up -d
   ```

4. The application will be available at:
   - Web Interface: http://localhost
   - API: http://localhost:5000

## Data Persistence

All data is stored in Docker volumes:
- video-data: Contains uploaded videos
- db-data: Contains the database

You can back up these volumes using Docker volume backup commands.
EOF

# Create a deployment script
cat > ./docker-export/deploy-imported.sh << 'EOF'
#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying Video Courses Platform from imported images...${NC}"

# Check for Docker and Docker Compose
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: Docker is not installed.${NC}" >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo -e "${RED}Error: Docker Compose is not installed.${NC}" >&2
  exit 1
fi

# Check if images are loaded
if ! docker image inspect video-platform-client >/dev/null 2>&1; then
  echo -e "${YELLOW}Loading Docker images...${NC}"
  docker load -i video-platform-images.tar
fi

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Check containers status
echo -e "${YELLOW}Checking container status:${NC}"
docker-compose ps

echo -e "${GREEN}=== Deployment Completed Successfully ===${NC}"
echo -e "${GREEN}Client is running at: http://localhost${NC}"
echo -e "${GREEN}Server API is running at: http://localhost:5000${NC}"
EOF

# Make the script executable
chmod +x ./docker-export/deploy-imported.sh

# Copy the docker-compose file
cp docker-compose.yml ./docker-export/

# Create a zip file
echo -e "${YELLOW}Creating zip archive...${NC}"
zip -r video-platform-docker-package.zip ./docker-export

echo -e "${GREEN}=== Export Completed Successfully ===${NC}"
echo -e "${GREEN}Docker images exported to: ./docker-export/video-platform-images.tar${NC}"
echo -e "${GREEN}Deployment package created: video-platform-docker-package.zip${NC}"
echo -e "${YELLOW}Transfer this zip file to deploy on another server${NC}" 