import { useState, useEffect } from "react"

interface LibraryShape {
  filename: string
  display_name: string
}

export function ObjectLibrary() {
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
                cursor: "pointer",
                transition: "all 0.2s",
                backgroundColor: "#2a2a2a",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#333"
                e.currentTarget.style.borderColor = "#3b82f6"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2a2a2a"
                e.currentTarget.style.borderColor = "#333"
              }}
              onClick={() => console.log("Clicked:", shape.filename)}
            >
              <div style={{ fontWeight: 500 }}>{shape.display_name}</div>
              <div style={{ fontSize: "12px", opacity: 0.6, marginTop: "4px" }}>
                {shape.filename}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
