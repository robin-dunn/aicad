const API_BASE_URL = "http://localhost:8000"

export interface Shape {
  params: any
  position: any
  rotation: any
  prompt: string
}

export interface ProjectData {
  name: string
  shapes: Shape[]
}

export const projectsApi = {
  async save(projectData: ProjectData) {
    const response = await fetch(`${API_BASE_URL}/projects/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    })
    if (!response.ok) {
      throw new Error(`Failed to save project: ${response.status}`)
    }
    return response.json()
  },

  async load(name: string) {
    const response = await fetch(`${API_BASE_URL}/projects/load/${name}`)
    if (!response.ok) {
      throw new Error(`Failed to load project: ${response.status}`)
    }
    return response.json()
  },

  async list() {
    const response = await fetch(`${API_BASE_URL}/projects/list`)
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`)
    }
    const data = await response.json()
    return data.projects || []
  },
}