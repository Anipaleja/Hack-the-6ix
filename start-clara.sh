#!/bin/bash

# CLARA Full-Stack Startup Script
echo "🚀 Starting CLARA Health Companion..."

# Check if backend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Backend already running on port 3000"
else
    echo "❌ Backend not running. Please start the backend first with:"
    echo "   cd /Users/anishpaleja/Hack-the-6ix && npm start"
    exit 1
fi

# Navigate to frontend directory
cd /Users/anishpaleja/Hack-the-6ix/CLARA-front-end

# Kill any existing processes on port 3001
echo "🧹 Cleaning up existing frontend processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start frontend on port 3001
echo "🎨 Starting CLARA Frontend on http://localhost:3001..."
PORT=3001 npx next start

echo "🎉 CLARA is running!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:3001"
