import type { Shape } from "./models"

interface DialogSaveProjectProps {
  shapes: Array<Shape>
  handleRemoveShape: (id: string) => void
}

export function SceneObjectsList({
  shapes,
  handleRemoveShape
}: DialogSaveProjectProps) {

  return (shapes.length > 0 && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Shapes ({shapes.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {shapes.map((shape) => (
                  <li
                    key={shape.id}
                    style={{
                      padding: "10px",
                      marginBottom: "10px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "4px",
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div style={{ marginBottom: "8px" }}>
                      <strong>{shape.prompt}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85em",
                        opacity: 0.7,
                        marginBottom: "4px",
                      }}
                    >
                      Pos: ({shape.position[0]}, {shape.position[1]},{" "}
                      {shape.position[2]})
                    </div>
                    <div
                      style={{
                        fontSize: "0.85em",
                        opacity: 0.7,
                        marginBottom: "8px",
                      }}
                    >
                      Rot: ({shape.rotation[0]}°, {shape.rotation[1]}°,{" "}
                      {shape.rotation[2]}°)
                    </div>
                    <button
                      onClick={() => handleRemoveShape(shape.id)}
                      style={{ width: "100%", padding: "6px" }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
  )
}
