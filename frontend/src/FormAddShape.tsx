interface FormAddShapeProps {
  prompt: string
  setPrompt: (prompt: string) => void
  position: { x: number; y: number; z: number }
  setPosition: (position: { x: number; y: number; z: number }) => void
  rotation: { x: number; y: number; z: number }
  setRotation: (rotation: { x: number; y: number; z: number }) => void
  handleGenerate: () => void
  loading: boolean
  error: string | null
}

export function FormAddShape({
  prompt,
  setPrompt,
  position,
  setPosition,
  rotation,
  setRotation,
  handleGenerate,
  loading,
  error,
}: FormAddShapeProps) {
  return (
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
  )
}
