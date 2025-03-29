#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment of Video Courses Platform...${NC}"

# Check for Docker and Docker Compose
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}Error: Docker is not installed.${NC}" >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ]; then
  echo -e "${RED}Error: Docker Compose is not installed.${NC}" >&2
  exit 1
fi

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose build

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers if running...${NC}"
docker-compose down --remove-orphans

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Wait for containers to be ready
echo -e "${YELLOW}Waiting for containers to be ready...${NC}"
sleep 5

# Check containers status
echo -e "${YELLOW}Checking container status:${NC}"
docker-compose ps

# Get container IPs
CLIENT_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' video-platform-client)
SERVER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' video-platform-server)

echo -e "${GREEN}=== Deployment Completed Successfully ===${NC}"
echo -e "${GREEN}Client is running at: http://localhost${NC}"
echo -e "${GREEN}Server API is running at: http://localhost:5000${NC}"
echo -e "${GREEN}Client container IP: ${CLIENT_IP}${NC}"
echo -e "${GREEN}Server container IP: ${SERVER_IP}${NC}"
echo -e "${YELLOW}Data is persisted in Docker volumes: video-data and db-data${NC}"

# Instructions for redeployment on another server
echo -e "${GREEN}To deploy on another server:${NC}"
echo -e "1. Save the images: ${YELLOW}docker save -o video-platform-images.tar video-platform-client video-platform-server${NC}"
echo -e "2. Transfer the file to the new server"
echo -e "3. On the new server: ${YELLOW}docker load -i video-platform-images.tar${NC}"
echo -e "4. Run: ${YELLOW}docker-compose up -d${NC}"