# Meilisearch Setup Guide with Docker

## Step 1: Install Docker Desktop

1. **Download Docker Desktop for Windows:**
   - Visit: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Download the installer (Docker Desktop Installer.exe)

2. **Install Docker Desktop:**
   - Run the installer
   - Follow the installation wizard
   - Restart your computer if prompted

3. **Start Docker Desktop:**
   - Open Docker Desktop from Start Menu
   - Wait for Docker to start (whale icon in system tray)
   - Make sure Docker is running (green status)

## Step 2: Run Meilisearch Container

Once Docker Desktop is running, open PowerShell and run:

```powershell
docker run -d -p 7700:7700 --name meilisearch getmeili/meilisearch:latest
```

### Alternative: With Data Persistence

To persist Meilisearch data (recommended for production):

```powershell
# Create data directory
mkdir meili_data

# Run Meilisearch with volume mount
docker run -d -p 7700:7700 -v ${PWD}/meili_data:/meili_data --name meilisearch getmeili/meilisearch:latest
```

### With Master Key (Recommended for Production)

```powershell
docker run -d -p 7700:7700 -e MEILI_MASTER_KEY='your-master-key-here' --name meilisearch getmeili/meilisearch:latest
```

## Step 3: Verify Meilisearch is Running

1. **Check container status:**
   ```powershell
   docker ps
   ```
   You should see `meilisearch` container running.

2. **Test Meilisearch:**
   - Open browser: http://localhost:7700
   - You should see Meilisearch welcome page or API response

3. **Check logs:**
   ```powershell
   docker logs meilisearch
   ```

## Step 4: Update Backend Environment

Update your `.env` file in the `backend` folder:

```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your-master-key-here  # If you set one
```

## Step 5: Reindex Ads

After Meilisearch is running, reindex your ads:

```powershell
cd backend
node scripts/reindex-meilisearch.js
```

Or use the API endpoint if available.

## Useful Docker Commands

- **Stop Meilisearch:**
  ```powershell
  docker stop meilisearch
  ```

- **Start Meilisearch:**
  ```powershell
  docker start meilisearch
  ```

- **Remove Meilisearch container:**
  ```powershell
  docker rm -f meilisearch
  ```

- **View logs:**
  ```powershell
  docker logs -f meilisearch
  ```

## Troubleshooting

1. **Port 7700 already in use:**
   - Change port: `docker run -d -p 7701:7700 ...`
   - Update `MEILISEARCH_HOST=http://localhost:7701` in `.env`

2. **Docker not starting:**
   - Make sure WSL 2 is enabled (Windows 10/11)
   - Check Docker Desktop settings
   - Restart Docker Desktop

3. **Connection refused:**
   - Wait a few seconds for Meilisearch to start
   - Check `docker logs meilisearch` for errors
   - Verify port 7700 is not blocked by firewall

## Next Steps

After Meilisearch is running:
1. Restart your backend server
2. Meilisearch will automatically initialize on first use
3. Ads will be indexed automatically when created/updated
4. Search will use Meilisearch instead of Prisma fallback
