import { useState, useEffect, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Stage } from "@react-three/drei"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { useLoader } from "@react-three/fiber"
import { Box3, Vector3 } from "three"
import "./App.css"

interface Shape {
  id: string
  url: string
  position: [number, number, number]
  prompt: string
}

function STLModel({
  url,
  position,
}: {
  url: string
  position: [number, number, number]
}) {
  const geometry = useLoader(STLLoader, url)

  return (
    <mesh geometry={geometry} position={position}>
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  )
}

function CameraController({ shapes }: { shapes: Shape[] }) {
  const { camera, scene } = useThree()
  const controlsRef = useRef<any>()

  useEffect(() => {
    if (shapes.length === 0) return

    // Calculate bounding box of all objects in the scene
    const box = new Box3()

    scene.traverse((object) => {
      if (object.type === "Mesh") {
        const meshBox = new Box3().setFromObject(object)
        box.union(meshBox)
      }
    })

    if (box.isEmpty()) return

    // Get the center and size of the bounding box
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())

    // Calculate the max dimension
    const maxDim = Math.max(size.x, size.y, size.z)

    // Calculate camera distance (with some padding)
    const fov = camera.fov * (Math.PI / 180)
    const paddingMultiplier = 5
    const cameraDistance =
      (maxDim / (2 * Math.tan(fov / 2))) * paddingMultiplier

    // Position camera at an angle
    const direction = new Vector3(1, 1, 1).normalize()
    camera.position.copy(direction.multiplyScalar(cameraDistance).add(center))

    // Update controls target to look at the center
    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }, [shapes, camera, scene])

  return <OrbitControls ref={controlsRef} autoRotate={false} />
}

function App() {
  const [prompt, setPrompt] = useState("cylinder radius 5 height 10")
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Generate the shape
      const generateResponse = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!generateResponse.ok) {
        throw new Error(`HTTP error! status: ${generateResponse.status}`)
      }

      const data = await generateResponse.json()
      console.log("Response from backend:", data)

      // Step 2: Download the STL file
      console.log("Downloading STL...")
      const downloadResponse = await fetch("http://localhost:8000/download/stl")

      if (!downloadResponse.ok) {
        throw new Error(`Download failed! status: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()

      // Create object URL for 3D viewer
      const url = window.URL.createObjectURL(blob)

      // Add new shape to the scene
      const newShape: Shape = {
        id: Date.now().toString(),
        url,
        position: [position.x, position.y, position.z],
        prompt,
      }

      setShapes((prev) => [...prev, newShape])

      console.log(`Loaded STL (${blob.size} bytes)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveShape = (id: string) => {
    setShapes((prev) => {
      const shape = prev.find((s) => s.id === id)
      if (shape) {
        window.URL.revokeObjectURL(shape.url)
      }
      return prev.filter((s) => s.id !== id)
    })
  }

  const handleClearAll = () => {
    shapes.forEach((shape) => {
      window.URL.revokeObjectURL(shape.url)
    })
    setShapes([])
  }

  return (
    <>
      <h1 style={{ margin: "10px 0", fontSize: "2rem" }}>Text-to-CAD App</h1>
      <div
        style={{ display: "flex", gap: "20px", height: "calc(100vh - 150px)" }}
      >
        {/* Left Panel - 30% */}
        <div
          style={{
            width: "30%",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
          }}
        >
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Add Shape</h2>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter shape description"
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "10px",
                fontSize: "16px",
              }}
            />

            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  X
                </label>
                <input
                  type="number"
                  value={position.x}
                  onChange={(e) =>
                    setPosition({
                      ...position,
                      x: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  Y
                </label>
                <input
                  type="number"
                  value={position.y}
                  onChange={(e) =>
                    setPosition({
                      ...position,
                      y: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  Z
                </label>
                <input
                  type="number"
                  value={position.z}
                  onChange={(e) =>
                    setPosition({
                      ...position,
                      z: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              {loading ? "Generating..." : "Add Shape"}
            </button>

            {shapes.length > 0 && (
              <button onClick={handleClearAll} style={{ width: "100%" }}>
                Clear All
              </button>
            )}

            {error && (
              <p style={{ color: "red", marginTop: "10px" }}>Error: {error}</p>
            )}
          </div>

          {shapes.length > 0 && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Shapes ({shapes.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {shapes.map((shape) => (
                  <li
                    key={shape.id}
                    style={{
                      padding: "10px",
                      marginBottom: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "4px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div style={{ marginBottom: "8px" }}>
                      <strong>{shape.prompt}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85em",
                        opacity: 0.7,
                        marginBottom: "8px",
                      }}
                    >
                      Pos: ({shape.position[0]}, {shape.position[1]},{" "}
                      {shape.position[2]})
                    </div>
                    <button
                      onClick={() => handleRemoveShape(shape.id)}
                      style={{ width: "100%", padding: "6px" }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Panel - 70% */}
        <div
          style={{
            width: "70%",
            border: "1px solid white",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {shapes.length > 0 ? (
            <Canvas camera={{ position: [50, 50, 50], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <directionalLight position={[-10, -10, -5]} intensity={0.5} />
              {shapes.map((shape) => (
                <STLModel
                  key={shape.id}
                  url={shape.url}
                  position={shape.position}
                />
              ))}
              <CameraController shapes={shapes} />
            </Canvas>
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.5,
              }}
            >
              <p>Add shapes to see them rendered here</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App
