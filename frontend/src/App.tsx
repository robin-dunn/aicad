import { useState, useEffect, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { useLoader } from "@react-three/fiber"
import { Box3, PerspectiveCamera, Vector3 } from "three"
import "./App.css"
import { DialogOpenProject } from "./DialogOpenProject"
import { useSaveProject } from "./hooks/useProjects"
import { DialogSaveProject } from "./DialogSaveProject"
import type { Shape } from "./models"
import { SceneObjectsList } from "./SceneObjectsList"
import { ObjectLibrary } from "./ObjectLibrary"

function STLModel({
  url,
  position,
  rotation,
}: {
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const geometry = useLoader(STLLoader, url)

  // Convert degrees to radians for Three.js
  const rotationRadians: [number, number, number] = [
    (rotation[0] * Math.PI) / 180,
    (rotation[1] * Math.PI) / 180,
    (rotation[2] * Math.PI) / 180,
  ]

  return (
    <mesh geometry={geometry} position={position} rotation={rotationRadians}>
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  )
}

function CameraController({ shapes }: { shapes: Shape[] }) {
  const { camera, scene } = useThree((state) => ({
    camera: state.camera as PerspectiveCamera,
    scene: state.scene,
  }))

  const controlsRef = useRef<any>(undefined)

  useEffect(() => {
    if (shapes.length === 0) return

    const box = new Box3()

    scene.traverse((object) => {
      if (object.type === "Mesh") {
        const meshBox = new Box3().setFromObject(object)
        box.union(meshBox)
      }
    })

    if (box.isEmpty()) return

    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    const paddingMultiplier = 5
    const cameraDistance =
      (maxDim / (2 * Math.tan(fov / 2))) * paddingMultiplier

    const direction = new Vector3(1, 1, 1).normalize()
    camera.position.copy(direction.multiplyScalar(cameraDistance).add(center))

    if (controlsRef.current) {
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }, [shapes, camera, scene])

  return <OrbitControls ref={controlsRef} autoRotate={false} />
}

function AxisHelper() {
  return (
    <group>
      <arrowHelper
        args={[new Vector3(1, 0, 0), new Vector3(0, 0, 0), 20, 0xff0000]}
      />
      <arrowHelper
        args={[new Vector3(0, 1, 0), new Vector3(0, 0, 0), 20, 0x00ff00]}
      />
      <arrowHelper
        args={[new Vector3(0, 0, 1), new Vector3(0, 0, 0), 20, 0x0000ff]}
      />
      <gridHelper args={[50, 10, 0x888888, 0x444444]} />
    </group>
  )
}

function App() {
  const [prompt, setPrompt] = useState("cylinder radius 5 height 10")
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [dialog, setDialog] = useState({ name: "", isOpen: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])
  const saveProjectMutation = useSaveProject()

  // New state for project management
  const [projectName, setProjectName] = useState("")
  const [availableProjects, setAvailableProjects] = useState<string[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)

    try {
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

      console.log("Downloading STL...")
      const downloadResponse = await fetch("http://localhost:8000/download/stl")

      if (!downloadResponse.ok) {
        throw new Error(`Download failed! status: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()
      const url = window.URL.createObjectURL(blob)

      const newShape: Shape = {
        id: Date.now().toString(),
        url,
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        prompt,
        params: data.params, // Store backend params
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

  const handleAddLibraryShape = async (libraryShape: {
    filename: string
    display_name: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      console.log("Loading library shape:", libraryShape.filename)

      // Fetch the STL file from the library
      const downloadResponse = await fetch(
        `http://localhost:8000/library/shapes/${libraryShape.filename}`
      )

      if (!downloadResponse.ok) {
        throw new Error(`Download failed! status: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()
      console.log(`Loaded library STL (${blob.size} bytes), type: ${blob.type}`)

      // Check if blob is too large (e.g., > 50MB)
      if (blob.size > 50 * 1024 * 1024) {
        throw new Error(
          `STL file too large: ${(blob.size / 1024 / 1024).toFixed(
            2
          )}MB. Max 50MB.`
        )
      }

      // Validate it's actually an STL file by checking the blob
      const arrayBuffer = await blob.arrayBuffer()
      const view = new DataView(arrayBuffer)

      // STL files should start with "solid" (ASCII) or have a specific binary header
      const textDecoder = new TextDecoder()
      const header = textDecoder.decode(new Uint8Array(arrayBuffer, 0, 5))

      console.log("STL header:", header)

      const url = window.URL.createObjectURL(blob)

      const newShape: Shape = {
        id: Date.now().toString(),
        url,
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        prompt: `Library: ${libraryShape.display_name}`,
        params: {}, // Library shapes don't have generation params
      }

      setShapes((prev) => [...prev, newShape])

      console.log(`Successfully added library shape`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load library shape"
      )
      console.error("Error loading library shape:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProject = async (projectName: string) => {
    if (!projectName.trim()) {
      setError("Please enter a project name")
      return
    }
    const projectData = {
      name: projectName,
      shapes: shapes.map((shape) => ({
        params: shape.params,
        position: shape.position,
        rotation: shape.rotation,
        prompt: shape.prompt,
      })),
    }

    saveProjectMutation.mutate(projectData, {
      onSuccess: () => {
        setProjectName(projectName)
        setDialog({ name: "", isOpen: false })
      },
    })
  }

const handleLoadProject = async (name: string) => {
  setLoading(true)
  setError(null)

  // Clear existing shapes
  handleClearAll()

  try {
    const response = await fetch(
      `http://localhost:8000/projects/load?project_name=${encodeURIComponent(
        name
      )}`,
      {
        method: "POST",
      }
    )

    if (!response.ok) {
      throw new Error(`Load failed! status: ${response.status}`)
    }

    const result = await response.json()
    console.log("Project loaded:", result)

    // Regenerate each shape
    for (let idx = 0; idx < result.shapes.length; idx++) {
      const shapeData = result.shapes[idx]

      // Check if this is a library shape (empty params or starts with "Library:")
      const isLibraryShape =
        !shapeData.params ||
        Object.keys(shapeData.params).length === 0 ||
        (shapeData.prompt && shapeData.prompt.startsWith("Library:"))

      let blob: Blob

      if (isLibraryShape) {
        console.log(`Loading library shape ${idx} from project`)
        // Load from saved STEP file in project
        const shapeResponse = await fetch(
          `http://localhost:8000/projects/${encodeURIComponent(
            name
          )}/shapes/${idx}`
        )

        if (!shapeResponse.ok) {
          console.error(`Failed to load shape ${idx}`)
          continue
        }

        blob = await shapeResponse.blob()
      } else {
        console.log(`Generating shape ${idx} from params`)
        // Generate from params for programmatically created shapes
        const generateResponse = await fetch(
          "http://localhost:8000/generate_from_params",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(shapeData.params),
          }
        )

        if (!generateResponse.ok) {
          console.error(`Failed to generate shape ${idx}`)
          continue
        }

        const downloadResponse = await fetch(
          "http://localhost:8000/download/stl"
        )
        if (!downloadResponse.ok) {
          console.error(`Failed to download shape ${idx}`)
          continue
        }

        blob = await downloadResponse.blob()
      }

      const url = window.URL.createObjectURL(blob)

      const loadedShape: Shape = {
        id: Date.now().toString() + Math.random(), // Unique ID
        url,
        position: shapeData.position || [0, 0, 0],
        rotation: shapeData.rotation || [0, 0, 0],
        prompt: shapeData.prompt || "",
        params: shapeData.params || {},
      }

      setShapes((prev) => [...prev, loadedShape])

      // Small delay to avoid overwhelming the backend
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    setProjectName(name)
    setShowProjectDialog(false)
    alert(`Project "${name}" loaded successfully!`)
  } catch (err) {
    setError(err instanceof Error ? err.message : "Load failed")
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
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: "20px",
      }}
    >
      <button
        onClick={() => setDialog({ name: "Open Project", isOpen: true })}
        disabled={loading}
        style={{ flex: 1 }}
      >
        Open Project
      </button>
      <button
        onClick={() => setDialog({ name: "Save Project", isOpen: true })}
        disabled={loading}
        style={{ flex: 1 }}
      >
        Save Project
      </button>
    </div>
    <DialogOpenProject
      isOpen={dialog.name === "Open Project" && dialog.isOpen}
      onClose={() => setDialog({ name: "", isOpen: false })}
      onLoad={handleLoadProject}
      currentProjectName={projectName}
    />
    <DialogSaveProject
      isOpen={dialog.name === "Save Project" && dialog.isOpen}
      onClose={() => setDialog({ name: "", isOpen: false })}
      onSave={handleSaveProject}
      currentProjectName={projectName}
    />
    <div
      style={{
        display: "flex",
        gap: "20px",
        height: "calc(100vh - 150px)",
        flexGrow: 1,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "30%",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflowY: "auto",
        }}
      >
        {/* Existing Add Shape Card */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Add Shape</h2>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. cylinder radius 5 height 10 lying"
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "10px",
              fontSize: "16px",
            }}
          />

          <h3 style={{ fontSize: "14px", marginBottom: "5px" }}>Position</h3>
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

          <h3 style={{ fontSize: "14px", marginBottom: "5px" }}>
            Rotation (degrees)
          </h3>
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
                value={rotation.x}
                onChange={(e) =>
                  setRotation({
                    ...rotation,
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
                value={rotation.y}
                onChange={(e) =>
                  setRotation({
                    ...rotation,
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
                value={rotation.z}
                onChange={(e) =>
                  setRotation({
                    ...rotation,
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

          {error && (
            <p style={{ color: "red", marginTop: "10px" }}>Error: {error}</p>
          )}
        </div>

        <SceneObjectsList
          shapes={shapes}
          handleRemoveShape={handleRemoveShape}
        />
        <ObjectLibrary onAddToScene={handleAddLibraryShape} />
      </div>

      {/* Canvas area */}
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

            <AxisHelper />

            {shapes.map((shape) => (
              <STLModel
                key={shape.id}
                url={shape.url}
                position={shape.position}
                rotation={shape.rotation}
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