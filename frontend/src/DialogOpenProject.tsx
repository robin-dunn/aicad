import { useState, useEffect } from "react"

interface DialogOpenProjectProps {
  isOpen: boolean
  onClose: () => void
  onLoad: (name: string) => void
  currentProjectName?: string
}

export function DialogOpenProject({
  isOpen,
  onClose,
  onLoad,
  currentProjectName,
}: DialogOpenProjectProps) {
  const [projects, setProjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
      setSearchTerm("")
    }
  }, [isOpen])

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://localhost:8000/projects/list")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`)
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects")
      console.error("Error fetching projects:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (name: string) => {
    onLoad(name)
    onClose()
  }

  const filteredProjects = projects.filter((project) =>
    project.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: 0, marginBottom: "8px" }}>Open Project</h2>
          <p style={{ margin: 0, opacity: 0.7, fontSize: "0.9em" }}>
            Select a project to open
          </p>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search projects..."
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

        {/* Projects List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: "16px",
            minHeight: "200px",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
              Loading projects...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
              {searchTerm
                ? "No projects match your search"
                : "No saved projects"}
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {filteredProjects.map((project) => (
                <li
                  key={project}
                  onClick={() => handleProjectClick(project)}
                  style={{
                    padding: "12px 16px",
                    marginBottom: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor:
                      project === currentProjectName
                        ? "rgba(59, 130, 246, 0.3)"
                        : "rgba(255, 255, 255, 0.05)",
                    transition: "background-color 0.2s, transform 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (project !== currentProjectName) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.15)"
                      e.currentTarget.style.transform = "translateX(4px)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (project !== currentProjectName) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.05)"
                      e.currentTarget.style.transform = "translateX(0)"
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1em" }}>{project}</span>
                    {project === currentProjectName && (
                      <span
                        style={{
                          fontSize: "0.75em",
                          padding: "2px 6px",
                          backgroundColor: "rgba(59, 130, 246, 0.5)",
                          borderRadius: "3px",
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={fetchProjects}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              backgroundColor: "rgba(59, 130, 246, 0.8)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
