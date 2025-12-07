#!/bin/bash
# Bash script to run both backend and frontend
# Run: chmod +x run-dev.sh && ./run-dev.sh

echo "Starting SellIt Development Servers..."

# Start backend in background
cd backend && npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

