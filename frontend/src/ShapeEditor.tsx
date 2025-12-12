import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Link } from "react-router-dom"
import "./App.css"

interface ShapePrimitive {
  id: string
  type: "box" | "cylinder" | "sphere"
  width?: number
  height?: number
  depth?: number
  radius?: number
  position: [number, number, number]
  operation: "add" | "subtract"
}

function ShapePreview({ shapes }: { shapes: ShapePrimitive[] }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />

      {shapes.map((shape, index) => {
        const color = shape.operation === "add" ? "#4caf50" : "#f44336"

        if (shape.type === "box") {
          return (
            <mesh key={shape.id} position={shape.position}>
              <boxGeometry
                args={[
                  shape.width || 10,
                  shape.height || 10,
                  shape.depth || 10,
                ]}
              />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        } else if (shape.type === "cylinder") {
          return (
            <mesh key={shape.id} position={shape.position}>
              <cylinderGeometry args={[shape.radius || 5, shape.radius || 5, shape.height || 10, 32]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        } else if (shape.type === "sphere") {
          return (
            <mesh key={shape.id} position={shape.position}>
              <sphereGeometry args={[shape.radius || 5, 32, 32]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.8}
              />
            </mesh>
          )
        }
        return null
      })}

      <OrbitControls />
      <gridHelper args={[50, 10]} />
    </>
  )
}

export default function ShapeEditor() {
  const [shapes, setShapes] = useState<ShapePrimitive[]>([])
  const [shapeName, setShapeName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // Current shape being edited
  const [newShape, setNewShape] = useState<ShapePrimitive>({
    id: Date.now().toString(),
    type: "box",
    width: 10,
    height: 10,
    depth: 10,
    position: [0, 0, 0],
    operation: "add",
  })

  const handleAddShape = () => {
    setShapes([...shapes, { ...newShape, id: Date.now().toString() }])
    // Reset form
    setNewShape({
      id: Date.now().toString(),
      type: "box",
      width: 10,
      height: 10,
      depth: 10,
      position: [0, 0, 0],
      operation: "add",
    })
  }

  const handleRemoveShape = (id: string) => {
    setShapes(shapes.filter((s) => s.id !== id))
  }

  const handleSaveToLibrary = async () => {
    if (!shapeName.trim()) {
      setMessage({ type: "error", text: "Please enter a shape name" })
      return
    }

    if (shapes.length === 0) {
      setMessage({ type: "error", text: "Please add at least one primitive" })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("http://localhost:8000/library/save-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: shapeName,
          primitives: shapes,
        }),
      })

      if (!response.ok) {
        throw new Error(`Save failed! status: ${response.status}`)
      }

      const result = await response.json()
      setMessage({
        type: "success",
        text: `Shape "${shapeName}" saved successfully to library!`,
      })

      // Clear the editor
      setShapes([])
      setShapeName("")
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save shape",
      })
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1800px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ margin: 0 }}>Custom Shape Editor</h1>
        <Link to="/">
          <button>← Back to Garden Designer</button>
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "10px 20px",
            marginBottom: "20px",
            backgroundColor: message.type === "success" ? "#4caf50" : "#f44336",
            color: "white",
            borderRadius: "4px",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Left Panel - Editor Controls */}
        <div style={{ width: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Shape Name */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Shape Name</h3>
            <input
              type="text"
              value={shapeName}
              onChange={(e) => setShapeName(e.target.value)}
              placeholder="e.g. Custom Planter Box"
              style={{ width: "100%", padding: "8px", fontSize: "16px" }}
            />
          </div>

          {/* Add Primitive */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add Primitive</h3>

            <label style={{ display: "block", marginBottom: "8px" }}>Type:</label>
            <select
              value={newShape.type}
              onChange={(e) =>
                setNewShape({
                  ...newShape,
                  type: e.target.value as "box" | "cylinder" | "sphere",
                })
              }
              style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
            >
              <option value="box">Box</option>
              <option value="cylinder">Cylinder</option>
              <option value="sphere">Sphere</option>
            </select>

            <label style={{ display: "block", marginBottom: "8px" }}>Operation:</label>
            <select
              value={newShape.operation}
              onChange={(e) =>
                setNewShape({
                  ...newShape,
                  operation: e.target.value as "add" | "subtract",
                })
              }
              style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
            >
              <option value="add">Add (Green)</option>
              <option value="subtract">Subtract (Red)</option>
            </select>

            {/* Dimensions */}
            {newShape.type === "box" && (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <label>Width: {newShape.width}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={newShape.width || 10}
                    onChange={(e) =>
                      setNewShape({ ...newShape, width: parseFloat(e.target.value) })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label>Height: {newShape.height}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={newShape.height || 10}
                    onChange={(e) =>
                      setNewShape({ ...newShape, height: parseFloat(e.target.value) })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label>Depth: {newShape.depth}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={newShape.depth || 10}
                    onChange={(e) =>
                      setNewShape({ ...newShape, depth: parseFloat(e.target.value) })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </>
            )}

            {(newShape.type === "cylinder" || newShape.type === "sphere") && (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <label>Radius: {newShape.radius}</label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={newShape.radius || 5}
                    onChange={(e) =>
                      setNewShape({ ...newShape, radius: parseFloat(e.target.value) })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                {newShape.type === "cylinder" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label>Height: {newShape.height}</label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={newShape.height || 10}
                      onChange={(e) =>
                        setNewShape({ ...newShape, height: parseFloat(e.target.value) })
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Position */}
            <h4>Position</h4>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px" }}>X</label>
                <input
                  type="number"
                  value={newShape.position[0]}
                  onChange={(e) =>
                    setNewShape({
                      ...newShape,
                      position: [parseFloat(e.target.value) || 0, newShape.position[1], newShape.position[2]],
                    })
                  }
                  style={{ width: "100%", padding: "4px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px" }}>Y</label>
                <input
                  type="number"
                  value={newShape.position[1]}
                  onChange={(e) =>
                    setNewShape({
                      ...newShape,
                      position: [newShape.position[0], parseFloat(e.target.value) || 0, newShape.position[2]],
                    })
                  }
                  style={{ width: "100%", padding: "4px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "12px" }}>Z</label>
                <input
                  type="number"
                  value={newShape.position[2]}
                  onChange={(e) =>
                    setNewShape({
                      ...newShape,
                      position: [newShape.position[0], newShape.position[1], parseFloat(e.target.value) || 0],
                    })
                  }
                  style={{ width: "100%", padding: "4px" }}
                />
              </div>
            </div>

            <button onClick={handleAddShape} style={{ width: "100%" }}>
              Add to Shape
            </button>
          </div>

          {/* Current Primitives List */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Primitives ({shapes.length})</h3>
            {shapes.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>No primitives yet. Add one above!</p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {shapes.map((shape) => (
                  <div
                    key={shape.id}
                    style={{
                      padding: "8px",
                      marginBottom: "8px",
                      backgroundColor: "#2a2a2a",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold" }}>
                        {shape.type} ({shape.operation === "add" ? "+" : "-"})
                      </div>
                      <div style={{ fontSize: "12px", color: "#888" }}>
                        Pos: [{shape.position.join(", ")}]
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShape(shape.id)}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveToLibrary}
            disabled={loading || shapes.length === 0 || !shapeName.trim()}
            style={{
              padding: "12px",
              fontSize: "16px",
              fontWeight: "bold",
              backgroundColor: shapes.length === 0 || !shapeName.trim() ? "#4b5563" : "#10b981",
              cursor: shapes.length === 0 || !shapeName.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "💾 Save to Library"}
          </button>
        </div>

        {/* Right Panel - 3D Preview */}
        <div style={{ flex: 1, border: "1px solid white", borderRadius: "4px", overflow: "hidden", minHeight: "700px" }}>
          <Canvas camera={{ position: [30, 30, 30], fov: 50 }}>
            <ShapePreview shapes={shapes} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
