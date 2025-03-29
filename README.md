# Video Courses Platform

A full-stack application for video courses with React client and Node.js server.

## Quick Start

To build and run the application using Docker:

### On Linux/macOS:

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd <repository-directory>

# Make deploy script executable
chmod +x deploy.sh

# Deploy the application
./deploy.sh
```

### On Windows:

```cmd
# Clone the repository (if not already done)
git clone <repository-url>
cd <repository-directory>

# Deploy the application using the batch file
deploy.bat
```

The application will be available at:
- Web Interface: http://localhost
- API: http://localhost:5000

## Deployment to Another Server

To deploy this application to a different server:

### Option 1: Build on Target Server

1. Clone the repository on the target server
2. Run the deploy script:
   
   On Linux/macOS:
   ```bash
   ./deploy.sh
   ```
   
   On Windows:
   ```cmd
   deploy.bat
   ```

### Option 2: Transfer Pre-built Docker Images

1. On the source server, build and export the Docker images:
   
   On Linux/macOS:
   ```bash
   # Make export script executable
   chmod +x export-images.sh
   
   # Export Docker images
   ./export-images.sh
   ```
   
   On Windows:
   ```cmd
   # Export Docker images
   export-images.bat
   ```

2. Transfer the resulting `video-platform-docker-package.zip` to the target server

3. On the target server:
   
   On Linux/macOS:
   ```bash
   # Extract the package
   unzip video-platform-docker-package.zip
   cd docker-export
   
   # Make deploy script executable
   chmod +x deploy-imported.sh
   
   # Deploy the application
   ./deploy-imported.sh
   ```
   
   On Windows:
   ```cmd
   # Extract the package
   # You can use the Windows Explorer to extract the zip file
   cd docker-export
   
   # Deploy the application
   deploy-imported.bat
   ```

## Project Structure

- `client/`: React frontend application
- `server/`: Node.js backend application
- `docker-compose.yml`: Docker Compose configuration
- `deploy.sh` / `deploy.bat`: Scripts to build and deploy the application
- `export-images.sh` / `export-images.bat`: Scripts to export Docker images for deployment elsewhere

## Data Persistence

All data is stored in Docker volumes:
- `video-data`: Contains uploaded videos
- `db-data`: Contains database files

## Environment Variables

The server uses the following environment variables (configured in `.env` file):

- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET`: Secret for JWT token generation
- `PORT`: Server port (default: 5000)

## License

This project is licensed under the MIT License. 