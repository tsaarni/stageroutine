interface DemoFrameProps {
  src: string;
  height?: number;
  title?: string;
}

export function DemoFrame({ src, height = 280, title = "StageRoutine Live Demo" }: DemoFrameProps) {
  return (
    <div
      style={{
        margin: "1.5rem 0",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        background: "#0c0e12",
      }}
    >
      <iframe
        src={src}
        title={title}
        style={{
          width: "100%",
          height: `${height}px`,
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}
