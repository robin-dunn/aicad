import { useState, useEffect } from "react"

interface LibraryShape {
  filename: string
  display_name: string
  attributes?: Record<string, string>
}

interface ObjectLibraryProps {
  onAddToScene: (shape: LibraryShape) => void
}

export function ObjectLibrary({ onAddToScene }: ObjectLibraryProps) {
  const [shapes, setShapes] = useState<LibraryShape[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLibraryShapes()
  }, [])

  const fetchLibraryShapes = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("http://localhost:8000/library/shapes")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setShapes(data.shapes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library")
      console.error("Error fetching library:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Object Library</h2>
      {loading && <p>Loading library...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!loading && !error && shapes.length === 0 && (
        <p style={{ opacity: 0.6 }}>No shapes in library</p>
      )}
      {!loading && shapes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {shapes.map((shape) => (
            <div
              key={shape.filename}
              style={{
                padding: "12px",
                border: "1px solid #333",
                borderRadius: "4px",
                backgroundColor: "#2a2a2a",
                display: "flex",
                justifyContent: "space-between",
                textAlign: "left",
              }}
            >
              <div>
                {shape.attributes && (
                  <div style={{ fontWeight: 500 }}>
                    {shape.attributes["TraceParts.PartTitle"]}
                  </div>
                )}
                <div style={{ fontWeight: 500 }}>{shape.display_name}</div>
                <div
                  style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}
                >
                  {shape.filename}
                </div>
              </div>
              <button
                onClick={() => onAddToScene(shape)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "14px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6"
                }}
              >
                Add to Scene
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}