#!/bin/bash

# Simple development startup script
# Runs both frontend and backend in development mode

echo "🚀 Starting Vivirion Health App in Development Mode..."

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

echo "📦 Installing dependencies..."
npm install --silent

echo "📦 Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..

echo "🔧 Starting backend server..."
npm start &

echo "⏳ Waiting for backend to start..."
sleep 5

echo "📱 Starting frontend server..."
cd frontend && PORT=3001 npm start &
cd ..

echo "✅ Both servers are starting up..."
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Demo Credentials:"
echo "  Email: demo@example.com"
echo "  Password: demo123"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap 'echo "Stopping servers..."; pkill -f "node.*server.js"; pkill -f "react-scripts"; exit 0' SIGINT
wait
