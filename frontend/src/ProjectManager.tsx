import { useState, useEffect } from "react"

interface ProjectManagerProps {
  projectName: string
  setProjectName: (name: string) => void
  onSave: () => void
  onLoad: (name: string) => void
  loading: boolean
  shapesCount: number
}

export function ProjectManager({
  projectName,
  setProjectName,
  onSave,
  onLoad,
  loading,
  shapesCount,
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<string[]>([])
  const [fetchingProjects, setFetchingProjects] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setFetchingProjects(true)
    setFetchError(null)

    try {
      const response = await fetch("http://localhost:8000/projects/list")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`)
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch projects")
      console.error("Error fetching projects:", err)
    } finally {
      setFetchingProjects(false)
    }
  }

  const handleProjectClick = (name: string) => {
    setProjectName(name)
    onLoad(name)
  }

  const handleSaveAndRefresh = async () => {
    await onSave()
    // Refresh the project list after saving
    await fetchProjects()
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Project</h2>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter project name"
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: "10px",
          fontSize: "16px",
        }}
      />
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button
          onClick={handleSaveAndRefresh}
          disabled={loading || shapesCount === 0}
          style={{ flex: 1 }}
        >
          Save Project
        </button>
        <button 
          onClick={fetchProjects} 
          disabled={loading || fetchingProjects} 
          style={{ flex: 1 }}
        >
          {fetchingProjects ? "Refreshing..." : "Refresh List"}
        </button>
      </div>
      
      {projectName && (
        <div style={{ fontSize: "0.9em", opacity: 0.7, marginBottom: "10px" }}>
          Current: {projectName}
        </div>
      )}

      {/* Projects List */}
      <div style={{ marginTop: "15px" }}>
        <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
          Available Projects ({projects.length})
        </h3>
        
        {fetchError && (
          <div style={{ color: "#ff6b6b", fontSize: "0.85em", marginBottom: "8px" }}>
            {fetchError}
          </div>
        )}

        {fetchingProjects ? (
          <div style={{ opacity: 0.6, fontSize: "0.9em", padding: "10px" }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: "0.9em", padding: "10px" }}>
            No saved projects
          </div>
        ) : (
          <ul style={{ 
            listStyle: "none", 
            padding: 0, 
            margin: 0,
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            {projects.map((project) => (
              <li
                key={project}
                onClick={() => handleProjectClick(project)}
                style={{
                  padding: "8px 10px",
                  marginBottom: "5px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: 
                    project === projectName 
                      ? "rgba(59, 130, 246, 0.3)" 
                      : "rgba(255, 255, 255, 0.05)",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (project !== projectName) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (project !== projectName) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)"
                  }
                }}
              >
                <div style={{ fontSize: "0.95em" }}>{project}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
