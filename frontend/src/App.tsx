import { useState, useEffect, useRef } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { useLoader } from "@react-three/fiber"
import { Box3, PerspectiveCamera, Vector3, Plane } from "three"
import * as THREE from "three"
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
  onPositionChange,
  onDragStart,
  onDragEnd,
}: {
  id: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  isSelected: boolean
  onClick: () => void
  onPositionChange: (newPosition: [number, number, number]) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const geometry = useLoader(STLLoader, url)
  const { gl } = useThree()
  const meshRef = useRef<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef(new Vector3())

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

  const handlePointerDown = (e: any) => {
    if (!isSelected) return
    e.stopPropagation()

    // Use horizontal plane at object's Y position
    const groundPlane = new Plane(new Vector3(0, 1, 0), -position[1])
    const intersectionPoint = new Vector3()
    const hit = e.ray.intersectPlane(groundPlane, intersectionPoint)

    if (hit) {
      // Calculate and store offset from intersection to object center
      dragOffset.current.set(
        position[0] - intersectionPoint.x,
        0,
        position[2] - intersectionPoint.z
      )
    } else {
      // If no valid intersection (shallow angle), use zero offset
      dragOffset.current.set(0, 0, 0)
    }

    setIsDragging(true)
    onDragStart()
    gl.domElement.style.cursor = "grabbing"
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging || !isSelected) return
    e.stopPropagation()

    // Use horizontal plane at object's current Y position
    const groundPlane = new Plane(new Vector3(0, 1, 0), -position[1])
    const intersectionPoint = new Vector3()
    const hit = e.ray.intersectPlane(groundPlane, intersectionPoint)

    if (hit) {
      // Calculate new position with stored offset
      const newX = intersectionPoint.x + dragOffset.current.x
      const newZ = intersectionPoint.z + dragOffset.current.z

      // Validate: only update if movement is reasonable (within 100 units per frame)
      const deltaX = Math.abs(newX - position[0])
      const deltaZ = Math.abs(newZ - position[2])

      if (deltaX < 100 && deltaZ < 100) {
        onPositionChange([newX, position[1], newZ])
      }
    }
  }

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd()
      gl.domElement.style.cursor = "default"
    }
  }

  // Handle pointer up globally to catch releases outside the mesh
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        setIsDragging(false)
        onDragEnd()
        gl.domElement.style.cursor = "default"
      }
    }

    window.addEventListener("pointerup", handleGlobalPointerUp)
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp)
  }, [isDragging, onDragEnd, gl])

  console.log(`Rendering shape ${id}, isSelected: ${isSelected}`)

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      rotation={rotationRadians}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={() => {
        if (isSelected) {
          gl.domElement.style.cursor = "grab"
        }
      }}
      onPointerOut={() => {
        if (!isDragging) {
          gl.domElement.style.cursor = "default"
        }
      }}
      userData={{ isShape: true }}
    >
      <meshStandardMaterial
        color={isSelected ? "#fbbf24" : "#3b82f6"}
        emissive={isSelected ? "#f59e0b" : "#000000"}
        emissiveIntensity={isSelected ? 0.5 : 0}
      />
    </mesh>
  )
}

function CameraController({
  shapes,
  enabled,
}: {
  shapes: Shape[]
  enabled: boolean
}) {
  const { camera, scene } = useThree((state) => ({
    camera: state.camera as PerspectiveCamera,
    scene: state.scene,
  }))

  const controlsRef = useRef<any>(undefined)

  useEffect(() => {
    // Only auto-adjust camera when shapes are added/removed, not on first load
    if (shapes.length === 0) return

    const box = new Box3()

    scene.traverse((object) => {
      if (object.type === "Mesh" && object.userData.isShape) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes.length, camera, scene])

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={false}
      makeDefault
      enabled={enabled}
    />
  )
}

function Ground({
  onGroundClick,
  onGeometryReady,
}: {
  onGroundClick?: (point: Vector3) => void
  onGeometryReady?: (geometry: THREE.BufferGeometry) => void
}) {
  const meshRef = useRef<any>(null)
  const [geometry, setGeometry] = useState<any>(null)

  useEffect(() => {
    // Create a subdivided plane for terrain sculpting
    const geo = new THREE.PlaneGeometry(100, 100, 50, 50)
    setGeometry(geo)
    if (onGeometryReady) {
      onGeometryReady(geo)
    }
  }, [onGeometryReady])

  const handleClick = (e: any) => {
    if (onGroundClick) {
      e.stopPropagation()
      const point = e.point as Vector3
      onGroundClick(point)
    }
  }

  if (!geometry) return null

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={handleClick}
      geometry={geometry}
    >
      <meshStandardMaterial
        color="#4a7c59"
        roughness={0.8}
        metalness={0.2}
        wireframe={false}
      />
    </mesh>
  )
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
      <gridHelper args={[100, 20, 0x666666, 0x333333]} />
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
  const [isDraggingShape, setIsDraggingShape] = useState(false)
  const [terrainTool, setTerrainTool] = useState<"none" | "raise" | "lower">(
    "none"
  )
  const [groundGeometry, setGroundGeometry] = useState<THREE.BufferGeometry | null>(null)
  const saveProjectMutation = useSaveProject()

  // New state for project management
  const [projectName, setProjectName] = useState("")
  const [availableProjects, setAvailableProjects] = useState<string[]>([])
  const [showProjectDialog, setShowProjectDialog] = useState(false)

  // Debug logging for selection changes
  useEffect(() => {
    console.log("Selected shape ID changed to:", selectedShapeId)
  }, [selectedShapeId])

  // Keyboard controls for moving selected shape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedShapeId) return

      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return

      const moveStep = 1 // Movement step size

      let dx = 0
      let dz = 0

      switch (e.key) {
        case "ArrowLeft":
          dx = -moveStep
          e.preventDefault()
          break
        case "ArrowRight":
          dx = moveStep
          e.preventDefault()
          break
        case "ArrowUp":
          dz = -moveStep // Up moves forward in 3D space
          e.preventDefault()
          break
        case "ArrowDown":
          dz = moveStep // Down moves backward in 3D space
          e.preventDefault()
          break
        default:
          return
      }

      // Update the selected shape's position (Y stays constant)
      setShapes((prevShapes) =>
        prevShapes.map((shape) =>
          shape.id === selectedShapeId
            ? {
                ...shape,
                position: [
                  shape.position[0] + dx,
                  shape.position[1], // Keep Y constant - shapes can't fly
                  shape.position[2] + dz,
                ] as [number, number, number],
              }
            : shape
        )
      )
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
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

  const handleShapePositionChange = (
    id: string,
    newPosition: [number, number, number]
  ) => {
    setShapes((prevShapes) =>
      prevShapes.map((shape) =>
        shape.id === id ? { ...shape, position: newPosition } : shape
      )
    )
  }

  const handleGroundClick = (point: Vector3) => {
    if (terrainTool === "none" || !groundGeometry) return

    const positionAttribute = groundGeometry.getAttribute("position")
    const strength = terrainTool === "raise" ? 0.5 : -0.5
    const radius = 5 // Influence radius

    // Modify vertices within radius
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)

      // Calculate distance from click point (note: ground is rotated)
      const dx = x - point.x
      const dy = y - point.z
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < radius) {
        // Gaussian falloff for smooth hills/pits
        const falloff = Math.exp(-(distance * distance) / (radius * radius))
        const currentZ = positionAttribute.getZ(i)
        const newZ = currentZ + strength * falloff

        positionAttribute.setZ(i, newZ)
      }
    }

    positionAttribute.needsUpdate = true
    groundGeometry.computeVertexNormals()
  }

  // Get selected shape data
  const selectedShape = shapes.find((s) => s.id === selectedShapeId)

  console.log("Current selected shape:", selectedShape)

  return (
    <>
      {/* Terrain Tools Toolbar */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "10px",
          padding: "10px",
          backgroundColor: "#1a1a1a",
          borderBottom: "1px solid #333",
        }}
      >
        <span style={{ marginRight: "10px", fontWeight: "bold" }}>
          Terrain Tools:
        </span>
        <button
          onClick={() =>
            setTerrainTool(terrainTool === "raise" ? "none" : "raise")
          }
          style={{
            padding: "8px 16px",
            backgroundColor: terrainTool === "raise" ? "#10b981" : "#374151",
            color: "white",
            border: terrainTool === "raise" ? "2px solid #34d399" : "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: terrainTool === "raise" ? "bold" : "normal",
          }}
        >
          ⛰️ Raise Ground
        </button>
        <button
          onClick={() =>
            setTerrainTool(terrainTool === "lower" ? "none" : "lower")
          }
          style={{
            padding: "8px 16px",
            backgroundColor: terrainTool === "lower" ? "#ef4444" : "#374151",
            color: "white",
            border: terrainTool === "lower" ? "2px solid #f87171" : "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: terrainTool === "lower" ? "bold" : "normal",
          }}
        >
          🕳️ Lower Ground
        </button>
        {terrainTool !== "none" && (
          <span style={{ marginLeft: "10px", color: "#9ca3af", fontSize: "14px" }}>
            Click on the ground to sculpt terrain
          </span>
        )}
      </div>

      {/* Project Management Buttons */}
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
          <Canvas
            camera={{ position: [50, 50, 50], fov: 50 }}
            onPointerMissed={handleCanvasClick}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />

            <Ground
              onGroundClick={handleGroundClick}
              onGeometryReady={setGroundGeometry}
            />
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
                onPositionChange={(newPos) =>
                  handleShapePositionChange(shape.id, newPos)
                }
                onDragStart={() => setIsDraggingShape(true)}
                onDragEnd={() => setIsDraggingShape(false)}
              />
            ))}
            <CameraController shapes={shapes} enabled={!isDraggingShape} />
          </Canvas>
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

            <div>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                Controls:
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  fontWeight: "400",
                  color: "#d1d5db",
                }}
              >
                Drag or use arrow keys (← → ↑ ↓)
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