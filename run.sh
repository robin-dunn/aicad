#!/bin/bash

# Helper script to run both backend and frontend

echo "🚀 Starting Text-to-CAD..."

# Check if tmux is available
if command -v tmux &> /dev/null; then
    echo "Using tmux for split terminal..."
    tmux new-session -d -s textcad
    tmux split-window -h
    tmux select-pane -t 0
    tmux send-keys "cd backend && uv run uvicorn app:app --reload" C-m
    tmux select-pane -t 1
    tmux send-keys "cd frontend && npm run dev" C-m
    tmux attach-session -t textcad
else
    echo "⚠️  tmux not found. Please run these commands in separate terminals:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd backend && uv run uvicorn app:app --reload"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd frontend && npm run dev"
fi
