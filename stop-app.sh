#!/bin/bash

# Stop all Vivirion Health App processes

echo "🛑 Stopping Vivirion Health Application..."

# Kill backend processes
echo "Stopping backend server..."
pkill -f "node.*server.js" 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Kill frontend processes
echo "Stopping frontend server..."
pkill -f "react-scripts" 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Clean up any other related processes
pkill -f "npm.*start" 2>/dev/null || true

echo "✅ All servers stopped successfully"
