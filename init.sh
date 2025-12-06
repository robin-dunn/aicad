#!/bin/bash

# Text-to-CAD Project Setup Script
# Creates all necessary files and directories

set -e  # Exit on error

PROJECT_NAME="text-to-cad"

echo "🚀 Creating Text-to-CAD project structure..."

# Create root directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# ============================================
# BACKEND SETUP
# ============================================

echo "📦 Setting up backend..."

mkdir -p backend

# Create backend files
touch backend/app.py
touch backend/cad_generator.py
touch backend/parser.py
touch backend/README.md

# Create pyproject.toml for uv
cat > backend/pyproject.toml << 'EOF'
[project]
name = "text-to-cad-backend"
version = "0.1.0"
description = "Text-to-CAD backend service"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "cadquery>=2.4.0",
    "numpy-stl>=3.1.0",
    "pydantic>=2.5.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
EOF

# Create .python-version
echo "3.11" > backend/.python-version

# Create backend README
cat > backend/README.md << 'EOF'
# Text-to-CAD Backend

## Setup
```bash
# Install dependencies with uv
uv sync

# Run the server
uv run uvicorn app:app --reload
```

## API Endpoints

- `POST /generate` - Generate 3D shape from text prompt
- `GET /download/stl` - Download generated STL file
- `GET /health` - Health check

## Example Prompts

- "cylinder radius 5 height 10"
- "box width 15 depth 10 height 5"
- "sphere radius 8"
EOF

# ============================================
# FRONTEND SETUP
# ============================================

echo "⚛️  Setting up frontend..."

mkdir -p frontend/src
mkdir -p frontend/public

# Create frontend files
touch frontend/src/App.jsx
touch frontend/src/App.css
touch frontend/src/ModelViewer.jsx
touch frontend/src/main.jsx
touch frontend/index.html
touch frontend/vite.config.js
touch frontend/README.md

# Create package.json
cat > frontend/package.json << 'EOF'
{
  "name": "text-to-cad-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "three": "^0.158.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
EOF

# Create vite.config.js
cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
EOF

# Create index.html
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Text-to-CAD</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# Create main.jsx
cat > frontend/src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Create frontend README
cat > frontend/README.md << 'EOF'
# Text-to-CAD Frontend

## Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:5173

## Build for Production
```bash
npm run build
```
EOF

# ============================================
# ROOT LEVEL FILES
# ============================================

echo "📝 Creating root level files..."

# Create main README
cat > README.md << 'EOF'
# Text-to-CAD

A simple text-to-3D CAD tool that generates geometric shapes from natural language descriptions.

## Project Structure
```
text-to-cad/
├── backend/          # FastAPI backend
│   ├── app.py
│   ├── cad_generator.py
│   ├── parser.py
│   └── pyproject.toml
└── frontend/         # React + Three.js frontend
    ├── src/
    │   ├── App.jsx
    │   ├── ModelViewer.jsx
    │   └── main.jsx
    └── package.json
```

## Quick Start

### Backend
```bash
cd backend
uv sync
uv run uvicorn app:app --reload
```

Backend runs on http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Features

- Text-based 3D shape generation
- Real-time 3D visualization
- Support for basic primitives (cylinder, box, sphere)
- Interactive 3D viewer with orbit controls

## Tech Stack

- **Backend**: Python, FastAPI, CadQuery
- **Frontend**: React, Three.js, @react-three/fiber
- **Package Management**: uv (backend), npm (frontend)

## Example Prompts

- `cylinder radius 5 height 10`
- `box width 15 depth 10 height 5`
- `sphere radius 8`

## Future Enhancements

- [ ] ML-based natural language parsing
- [ ] Boolean operations (union, subtract, intersect)
- [ ] Multiple shape combinations
- [ ] Export to STEP/IGES formats
- [ ] Shape history and templates
- [ ] Advanced materials and rendering
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
*.egg-info/
dist/
build/
*.egg
.uv/

# Generated files
*.stl
*.step
*.iges
output.*

# Node
node_modules/
dist/
.vite/
*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
EOF

# Create run script
cat > run.sh << 'EOF'
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
EOF

chmod +x run.sh

# ============================================
# CREATE PLACEHOLDER COMMENTS IN FILES
# ============================================

echo "📄 Adding placeholder comments..."

# Backend files
cat > backend/app.py << 'EOF'
# TODO: Add FastAPI application code here
# See the main documentation for the complete implementation
EOF

cat > backend/cad_generator.py << 'EOF'
# TODO: Add CAD generation logic here
# This module handles the creation of 3D geometry using CadQuery
EOF

cat > backend/parser.py << 'EOF'
# TODO: Add text parsing logic here
# This module parses natural language into structured shape parameters
EOF

# Frontend files
cat > frontend/src/App.jsx << 'EOF'
// TODO: Add main App component here
// See the main documentation for the complete implementation
EOF

cat > frontend/src/App.css << 'EOF'
/* TODO: Add styling here */
/* See the main documentation for the complete implementation */
EOF

cat > frontend/src/ModelViewer.jsx << 'EOF'
// TODO: Add 3D model viewer component here
// This component uses Three.js to render STL files
EOF

# ============================================
# FINAL INSTRUCTIONS
# ============================================

echo ""
echo "✅ Project structure created successfully!"
echo ""
echo "📁 Project location: $(pwd)"
echo ""
echo "Next steps:"
echo ""
echo "1. Add code to the backend files:"
echo "   - backend/app.py"
echo "   - backend/cad_generator.py (optional, can keep logic in app.py)"
echo "   - backend/parser.py (optional, can keep logic in app.py)"
echo ""
echo "2. Add code to the frontend files:"
echo "   - frontend/src/App.jsx"
echo "   - frontend/src/App.css"
echo "   - frontend/src/ModelViewer.jsx"
echo ""
echo "3. Install backend dependencies:"
echo "   cd backend && uv sync"
echo ""
echo "4. Install frontend dependencies:"
echo "   cd frontend && npm install"
echo ""
echo "5. Run the application:"
echo "   ./run.sh (if you have tmux)"
echo "   OR run these in separate terminals:"
echo "   - cd backend && uv run uvicorn app:app --reload"
echo "   - cd frontend && npm run dev"
echo ""
echo "📚 See README.md for complete documentation"
echo ""