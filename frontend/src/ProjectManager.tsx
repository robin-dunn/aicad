import { useState, useEffect } from "react"
import { DialogOpenProject } from "./DialogOpenProject"

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch projects"
      )
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
    <>
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
            onClick={() => setIsDialogOpen(true)}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Open Project
          </button>
        </div>

        {projectName && (
          <div
            style={{ fontSize: "0.9em", opacity: 0.7, marginBottom: "10px" }}
          >
            Current: {projectName}
          </div>
        )}
      </div>

      <DialogOpenProject
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onLoad={onLoad}
        currentProjectName={projectName}
      />
    </>
  )
}