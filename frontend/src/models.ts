export interface Shape {
  id: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  prompt: string
  params: any // Store the backend params for saving
}
