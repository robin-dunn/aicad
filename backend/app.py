from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import cadquery as cq

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
    
    if "cylinder" in prompt:
        return {"shape": "cylinder", "radius": get_val("radius", 5), "height": get_val("height", 10)}
    elif "sphere" in prompt:
        return {"shape": "sphere", "radius": get_val("radius", 5)}
    else:  # box
        return {"shape": "box", "width": get_val("width", 10), "depth": get_val("depth", 10), "height": get_val("height", 10)}

def generate_cad(params: dict) -> cq.Workplane:
    """Generate CAD from parameters"""
    if params["shape"] == "cylinder":
        return cq.Workplane("XY").cylinder(params["height"], params["radius"])
    elif params["shape"] == "sphere":
        return cq.Workplane("XY").sphere(params["radius"])
    else:  # box
        return cq.Workplane("XY").box(params["width"], params["depth"], params["height"])

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