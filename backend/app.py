from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import cadquery as cq
import math

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ShapeRequest(BaseModel):
    prompt: str

def parse_prompt(prompt: str) -> dict:
    """Parse text into shape parameters"""
    prompt = prompt.lower()
    parts = prompt.split()
    
    def get_val(keyword: str, default: float) -> float:
        try:
            return float(parts[parts.index(keyword) + 1]) if keyword in parts else default
        except:
            return default
    
    # Parse rotation - looking for keywords like "rotx", "roty", "rotz" or "upright", "lying"
    rot_x = get_val("rotx", 0)
    rot_y = get_val("roty", 0)
    rot_z = get_val("rotz", 0)
    
    # Handle orientation keywords
    if "lying" in prompt or "horizontal" in prompt:
        rot_y = 90  # Rotate to lay on side
    elif "upright" in prompt or "vertical" in prompt or "standing" in prompt:
        rot_x = 0  # Default upright position
    
    if "cylinder" in prompt:
        return {
            "shape": "cylinder", 
            "radius": get_val("radius", 5), 
            "height": get_val("height", 10),
            "rotation": [rot_x, rot_y, rot_z]
        }
    elif "sphere" in prompt:
        return {
            "shape": "sphere", 
            "radius": get_val("radius", 5),
            "rotation": [rot_x, rot_y, rot_z]
        }
    else:  # box
        return {
            "shape": "box", 
            "width": get_val("width", 10), 
            "depth": get_val("depth", 10), 
            "height": get_val("height", 10),
            "rotation": [rot_x, rot_y, rot_z]
        }

def generate_cad(params: dict) -> cq.Workplane:
    """Generate CAD from parameters"""
    if params["shape"] == "cylinder":
        model = cq.Workplane("XY").cylinder(params["height"], params["radius"])
    elif params["shape"] == "sphere":
        model = cq.Workplane("XY").sphere(params["radius"])
    else:  # box
        model = cq.Workplane("XY").box(params["width"], params["depth"], params["height"])
    
    # Apply rotations
    rot = params.get("rotation", [0, 0, 0])
    if rot[0] != 0:
        model = model.rotate((0, 0, 0), (1, 0, 0), rot[0])
    if rot[1] != 0:
        model = model.rotate((0, 0, 0), (0, 1, 0), rot[1])
    if rot[2] != 0:
        model = model.rotate((0, 0, 0), (0, 0, 1), rot[2])
    
    return model

@app.post("/generate")
async def generate_shape(request: ShapeRequest):
    """Generate 3D shape from text"""
    params = parse_prompt(request.prompt)
    model = generate_cad(params)
    model.val().exportStl("output.stl")
    return {"success": True, "params": params, "file_url": "/download/stl"}

@app.get("/download/stl")
async def download_stl():
    """Download generated STL"""
    return FileResponse("output.stl", media_type="application/octet-stream", filename="shape.stl")

@app.get("/health")
async def health():
    return {"status": "ok"}