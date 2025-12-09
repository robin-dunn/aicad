import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projectsApi } from "../api/projects"
import type { ProjectData } from "../api/projects"

export function useSaveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (projectData: ProjectData) => projectsApi.save(projectData),
    onSuccess: (data, variables) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      console.log("Project saved successfully:", variables.name)
    },
    onError: (error) => {
      console.error("Failed to save project:", error)
    },
  })
}

export function useLoadProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => projectsApi.load(name),
    onSuccess: (data, variables) => {
      console.log("Project loaded successfully:", variables)
    },
    onError: (error) => {
      console.error("Failed to load project:", error)
    },
  })
}