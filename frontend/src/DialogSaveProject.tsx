import { useState, useEffect } from "react"

interface DialogSaveProjectProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  currentProjectName?: string
}

export function DialogSaveProject({
  isOpen,
  onClose,
  onSave,
  currentProjectName,
}: DialogSaveProjectProps) {
  const [projectName, setProjectName] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setProjectName(currentProjectName || "")
      setError(null)
    }
  }, [isOpen, currentProjectName])

  const handleSave = () => {
    const trimmedName = projectName.trim()
    
    if (!trimmedName) {
      setError("Project name cannot be empty")
      return
    }

    onSave(trimmedName)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#1e1e1e",
          borderRadius: "8px",
          padding: "24px",
          minWidth: "400px",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0, marginBottom: "8px" }}>Save Project</h2>
          <p style={{ margin: 0, opacity: 0.7, fontSize: "0.9em" }}>
            Enter a name for your project
          </p>
        </div>

        {/* Project Name Input */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Project name..."
          autoFocus
          style={{
            padding: "10px",
            marginBottom: "16px",
            fontSize: "16px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            color: "inherit",
          }}
        />

        {/* Error Message */}
        {error && (
          <div
            style={{
              color: "#ff6b6b",
              fontSize: "0.9em",
              marginBottom: "12px",
              padding: "8px",
              backgroundColor: "rgba(255, 107, 107, 0.1)",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {/* Footer Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(59, 130, 246, 0.8)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
