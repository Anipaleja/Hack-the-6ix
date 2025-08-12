#!/bin/bash

# Vivirion Health App Startup Script
# This script starts both the backend and frontend servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    if check_port $port; then
        print_warning "Port $port is in use. Killing existing processes..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to cleanup on exit
cleanup() {
    print_warning "Shutting down servers..."
    kill_port 5000
    kill_port 3001
    print_success "Cleanup completed"
    exit 0
}

# Set up trap for cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

print_status "🚀 Starting Vivirion Health Application..."
echo

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Frontend node_modules not found. Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Kill any existing processes on our ports
kill_port 5000
kill_port 3001

print_status "Starting backend server on port 5000..."

# Start backend server in background
npm start > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
print_status "Waiting for backend to initialize..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start. Check backend.log for details:"
    tail -n 20 backend.log
    exit 1
fi

# Test backend health
for i in {1..10}; do
    if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
        print_success "Backend server is running on http://localhost:5000"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Backend health check failed after 10 attempts"
        exit 1
    fi
    sleep 2
done

print_status "Starting frontend server on port 3001..."

# Start frontend server in background
cd frontend
PORT=3001 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
print_status "Waiting for frontend to initialize..."
sleep 10

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend failed to start. Check frontend.log for details:"
    tail -n 20 frontend.log
    exit 1
fi

# Test frontend
for i in {1..15}; do
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        print_success "Frontend server is running on http://localhost:3001"
        break
    fi
    if [ $i -eq 15 ]; then
        print_error "Frontend health check failed after 15 attempts"
        exit 1
    fi
    sleep 2
done

echo
print_success "🎉 Vivirion Health Application is now running!"
echo
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:3001"
echo -e "${BLUE}🔧 Backend:${NC}  http://localhost:5000"
echo -e "${BLUE}📚 API Docs:${NC} http://localhost:5000/"
echo
echo -e "${GREEN}Demo Credentials:${NC}"
echo -e "  Email: demo@example.com"
echo -e "  Password: demo123"
echo
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo

# Monitor both processes
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend server has stopped unexpectedly"
        exit 1
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend server has stopped unexpectedly"
        exit 1
    fi
    
    sleep 5
done
