# Text-to-CAD

A simple text-to-3D CAD tool that generates geometric shapes from natural language descriptions.

## Quick Start

### Backend
```bash
cd backend
uv sync
uv run uvicorn app:app --reload
```

Backend runs on http://localhost:8000

## Test

```shell
bash ./test.sh
```

## Features

- Text-based 3D shape generation

## Tech Stack

- **Backend**: Python, FastAPI, CadQuery
- **Frontend**: React, Three.js, @react-three/fiber

## Example Prompts

- `cylinder radius 5 height 10`
- `box width 15 depth 10 height 5`
- `sphere radius 8`
