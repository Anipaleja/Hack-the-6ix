# Vivirion Health Application Scripts

This directory contains shell scripts to easily run the Vivirion Health application.

## Available Scripts

### 🚀 `start-app.sh` (Recommended)
**Full production-style startup with health checks and monitoring**

```bash
./start-app.sh
```

Features:
- ✅ Dependency checking and installation
- ✅ Port conflict resolution
- ✅ Health checks for both servers
- ✅ Process monitoring
- ✅ Graceful shutdown on Ctrl+C
- ✅ Colored output and status messages
- ✅ Error logging and diagnostics

### 🛠️ `start-dev.sh`
**Quick development startup**

```bash
./start-dev.sh
```

Features:
- ⚡ Fast startup for development
- ⚡ Minimal logging
- ⚡ Simple process management

### 🛑 `stop-app.sh`
**Stop all application processes**

```bash
./stop-app.sh
```

Features:
- 🛑 Stops both frontend and backend
- 🛑 Kills processes on ports 3001 and 5000
- 🛑 Cleans up all related processes

## Usage

1. **First time setup:**
   ```bash
   ./start-app.sh
   ```

2. **For quick development:**
   ```bash
   ./start-dev.sh
   ```

3. **To stop everything:**
   ```bash
   ./stop-app.sh
   ```

## Server Information

- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:5000
- **API Documentation:** http://localhost:5000/

## Demo Credentials

- **Email:** demo@example.com
- **Password:** demo123

## Troubleshooting

If you encounter issues:

1. **Port conflicts:** The scripts automatically handle port conflicts
2. **Dependencies:** Run `npm install` in both root and frontend directories
3. **Logs:** Check `backend.log` and `frontend.log` for detailed error information
4. **Manual cleanup:** Run `./stop-app.sh` to clean up any stuck processes

## Requirements

- Node.js (v14 or higher)
- npm
- MongoDB Atlas connection (configured in .env)
- bash shell (macOS/Linux)

## Environment Variables

Make sure your `.env` file contains:
```
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
NODE_ENV=development
```
