from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import cadquery as cq
import math
import json
from pathlib import Path


LIBRARY_DIR = Path("library")

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

class ProjectFile(BaseModel):
    name: str
    shapes: list[dict]  # Each shape has params + optional STEP data

projects_dir = Path("data/projects")


@app.get("/projects/list")
async def list_projects():
    """List all projects by finding subdirectories with project.json files"""
    projects = []
    
    # Iterate through subdirectories in data/projects/
    if projects_dir.exists():
        for subdir in projects_dir.iterdir():
            if subdir.is_dir():
                # Check if this subdirectory contains a project.json file
                project_file = subdir / "project.json"
                if project_file.exists():
                    # Use the directory name as the project name
                    projects.append(subdir.name)
    
    # Sort alphabetically for better UX
    projects.sort()
    
    return {"projects": projects}


@app.post("/project/save")
async def save_project(project: ProjectFile):
    """Save project with B-Rep data"""
    project_dir = Path(f"{projects_dir}/{project.name}")
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Save metadata
    metadata = {
        "name": project.name,
        "shapes": []
    }
    
    # Save each shape as STEP (B-Rep format)
    for idx, shape_data in enumerate(project.shapes):
        model = generate_cad(shape_data["params"])
        step_path = project_dir / f"shape_{idx}.step"
        model.val().exportStep(str(step_path))
        
        metadata["shapes"].append({
            "params": shape_data["params"],  # Nested params
            "position": shape_data.get("position", [0, 0, 0]),
            "rotation": shape_data.get("rotation", [0, 0, 0]),
            "prompt": shape_data.get("prompt", ""),
            "brep_file": f"shape_{idx}.step"
        })
    
    # Save project metadata
    with open(project_dir / "project.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    return {"success": True, "path": str(project_dir)}

@app.post("/project/load")
async def load_project(project_name: str):
    """Load project from B-Rep data"""
    project_dir = Path(f"{projects_dir}/{project_name}")
    
    with open(project_dir / "project.json") as f:
        metadata = json.load(f)
    
    # Return the shapes exactly as they were saved
    return {"success": True, "shapes": metadata["shapes"]}


@app.post("/generate_from_params")
async def generate_from_params(params: dict):
    """Generate 3D shape from saved parameters"""
    model = generate_cad(params)
    model.val().exportStl("output.stl")
    return {"success": True, "params": params, "file_url": "/download/stl"}


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


@app.get("/library/shapes")
async def list_library_shapes():
    """List all STEP files in the library directory"""
    if not LIBRARY_DIR.exists():
        LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
        return {"shapes": []}
    
    shapes = []
    
    # Find all .step files
    for file_path in LIBRARY_DIR.glob("*.step"):
        shapes.append({
            "filename": file_path.name,
            "display_name": file_path.stem.replace("_", " ").title(),
        })
    
    shapes.sort(key=lambda x: x["filename"])
    return {"shapes": shapes}

@app.get("/library/shapes/{filename}")
async def get_library_shape(filename: str):
    """
    Fetch a specific library shape by filename.
    Converts STEP file to STL and returns it.
    """
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    step_path = LIBRARY_DIR / filename
    
    if not step_path.exists():
        raise HTTPException(status_code=404, detail="Shape not found")
    
    if not step_path.suffix.lower() == ".step":
        raise HTTPException(status_code=400, detail="Only STEP files are supported")
    
    try:
        # Load STEP file using cadquery
        print(f"Loading STEP file: {step_path}")
        result = cq.importers.importStep(str(step_path))
        
        # Create output directory
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        # Export to STL with coarse tolerance to reduce file size
        stl_filename = f"library_{filename.replace('.step', '.stl')}"
        stl_path = output_dir / stl_filename
        
        # Use aggressive tolerance values to create smaller meshes
        # tolerance: how far mesh can deviate from surface (bigger = coarser)
        # angularTolerance: angular deviation in radians (bigger = coarser)
        cq.exporters.export(
            result, 
            str(stl_path),
            tolerance=0.5,  # Increased from 0.1 for coarser mesh
            angularTolerance=0.5  # Increased from 0.1 for coarser mesh
        )
        
        file_size = stl_path.stat().st_size
        print(f"Converted to STL: {stl_path} (size: {file_size:,} bytes = {file_size/1024/1024:.2f} MB)")
        
        # Warn if file is very large
        if file_size > 10 * 1024 * 1024:  # 10MB
            print(f"WARNING: Large STL file generated ({file_size/1024/1024:.2f} MB)")
        
        return FileResponse(
            path=stl_path,
            media_type="application/octet-stream",
            filename=stl_filename
        )
    
    except Exception as e:
        print(f"Error converting library shape: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to convert shape: {str(e)}")