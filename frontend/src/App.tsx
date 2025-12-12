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
import { FormAddShape } from "./FormAddShape"

function STLModel({
  id,
  url,
  position,
  rotation,
  isSelected,
  onClick,
}: {
  id: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  isSelected: boolean
  onClick: () => void
}) {
  const geometry = useLoader(STLLoader, url)

  // Convert degrees to radians for Three.js
  const rotationRadians: [number, number, number] = [
    (rotation[0] * Math.PI) / 180,
    (rotation[1] * Math.PI) / 180,
    (rotation[2] * Math.PI) / 180,
  ]

  const handleClick = (e: any) => {
    e.stopPropagation()
    console.log("Shape clicked!", id, "isSelected:", isSelected)
    onClick()
  }

  console.log(`Rendering shape ${id}, isSelected: ${isSelected}`)

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotationRadians}
      onClick={handleClick}
      onPointerOver={() => console.log("Hover over shape", id)}
    >
      <meshStandardMaterial
        color={isSelected ? "#fbbf24" : "#3b82f6"}
        emissive={isSelected ? "#f59e0b" : "#000000"}
        emissiveIntensity={isSelected ? 0.5 : 0}
      />
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

  return <OrbitControls ref={controlsRef} autoRotate={false} makeDefault />
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
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const saveProjectMutation = useSaveProject()

  // New state for project management
  const [projectName, setProjectName] = useState("")
  const [availableProjects, setAvailableProjects] = useState<string[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)

  // Debug logging for selection changes
  useEffect(() => {
    console.log("Selected shape ID changed to:", selectedShapeId)
  }, [selectedShapeId])

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
        params: data.params,
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

      const downloadResponse = await fetch(
        `http://localhost:8000/library/shapes/${libraryShape.filename}`
      )

      if (!downloadResponse.ok) {
        throw new Error(`Download failed! status: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()
      console.log(`Loaded library STL (${blob.size} bytes), type: ${blob.type}`)

      if (blob.size > 50 * 1024 * 1024) {
        throw new Error(
          `STL file too large: ${(blob.size / 1024 / 1024).toFixed(
            2
          )}MB. Max 50MB.`
        )
      }

      const arrayBuffer = await blob.arrayBuffer()
      const view = new DataView(arrayBuffer)

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
        params: {},
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

      for (let idx = 0; idx < result.shapes.length; idx++) {
        const shapeData = result.shapes[idx]

        const isLibraryShape =
          !shapeData.params ||
          Object.keys(shapeData.params).length === 0 ||
          (shapeData.prompt && shapeData.prompt.startsWith("Library:"))

        let blob: Blob

        if (isLibraryShape) {
          console.log(`Loading library shape ${idx} from project`)
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
          id: Date.now().toString() + Math.random(),
          url,
          position: shapeData.position || [0, 0, 0],
          rotation: shapeData.rotation || [0, 0, 0],
          prompt: shapeData.prompt || "",
          params: shapeData.params || {},
        }

        setShapes((prev) => [...prev, loadedShape])

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
    if (selectedShapeId === id) {
      setSelectedShapeId(null)
    }
  }

  const handleClearAll = () => {
    shapes.forEach((shape) => {
      window.URL.revokeObjectURL(shape.url)
    })
    setShapes([])
    setSelectedShapeId(null)
  }

  const handleShapeClick = (id: string) => {
    console.log("handleShapeClick called with id:", id)
    setSelectedShapeId((prevId) => {
      console.log("Previous selected ID:", prevId, "New ID:", id)
      return id
    })
  }

  const handleCanvasClick = () => {
    console.log("Canvas background clicked - deselecting")
    setSelectedShapeId(null)
  }

  // Get selected shape data
  const selectedShape = shapes.find((s) => s.id === selectedShapeId)

  console.log("Current selected shape:", selectedShape)

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

      {/* Debug info */}
      <div
        style={{
          padding: "10px",
          backgroundColor: "#1f2937",
          fontSize: "12px",
        }}
      >
        Selected Shape ID: {selectedShapeId || "none"}
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          height: "calc(100vh - 250px)",
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
          <FormAddShape
            prompt={prompt}
            setPrompt={setPrompt}
            position={position}
            setPosition={setPosition}
            rotation={rotation}
            setRotation={setRotation}
            handleGenerate={handleGenerate}
            loading={loading}
            error={error}
          />

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
            <Canvas
              camera={{ position: [50, 50, 50], fov: 50 }}
              onPointerMissed={handleCanvasClick}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <directionalLight position={[-10, -10, -5]} intensity={0.5} />

              <AxisHelper />

              {shapes.map((shape) => (
                <STLModel
                  key={shape.id}
                  id={shape.id}
                  url={shape.url}
                  position={shape.position}
                  rotation={shape.rotation}
                  isSelected={shape.id === selectedShapeId}
                  onClick={() => handleShapeClick(shape.id)}
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

      {/* Bottom Toolbar - Selected Shape Inspector */}
      {selectedShape && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#1f2937",
            borderTop: "2px solid #fbbf24",
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#fbbf24", fontSize: "20px" }}>✓</span>
            <h3 style={{ margin: 0, color: "#fbbf24", fontSize: "16px" }}>
              Selected Shape
            </h3>
          </div>

          <div style={{ display: "flex", gap: "2rem", flex: 1 }}>
            <div>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Prompt:
              </span>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>
                {selectedShape.prompt}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Position:
              </span>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>
                [{selectedShape.position.join(", ")}]
              </p>
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Rotation:
              </span>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "500" }}>
                [{selectedShape.rotation.join(", ")}]°
              </p>
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>ID:</span>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "500",
                  fontFamily: "monospace",
                }}
              >
                {selectedShape.id}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleRemoveShape(selectedShape.id)}
            style={{
              backgroundColor: "#ef4444",
              padding: "0.5rem 1.5rem",
              border: "none",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              whiteSpace: "nowrap",
            }}
          >
            Delete Shape
          </button>
        </div>
      )}
    </>
  )
}

export default App