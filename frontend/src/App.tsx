import { useState } from 'react'
import "./App.css"

function App() {
  const [prompt, setPrompt] = useState("cylinder radius 5 height 10")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<any>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

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
      setResponse(data)

      // Step 2: Download the STL file
      console.log("Downloading STL...")
      const downloadResponse = await fetch("http://localhost:8000/download/stl")

      if (!downloadResponse.ok) {
        throw new Error(`Download failed! status: ${downloadResponse.status}`)
      }

      const blob = await downloadResponse.blob()

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "shape.stl"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log(`Saved as shape.stl (${blob.size} bytes)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>Text-to-CAD App</h1>
      <div className="card">
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
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Shape"}
        </button>

        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {response && (
          <div style={{ marginTop: "10px", textAlign: "left" }}>
            <p>Response:</p>
            <pre
              style={{
                background: "transparent",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto",
                border: "1px solid white",
              }}
            >
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  )
}

export default App