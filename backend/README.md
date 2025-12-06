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
