import type React from "react";

export function CoordinateSystemDiagram(): React.JSX.Element {
  return (
    <div style={{ textAlign: "center", margin: "2.5rem 0" }}>
      <svg
        role="img"
        aria-label="StageRoutine Coordinate System"
        viewBox="0 0 680 360"
        width="100%"
        style={{
          maxWidth: "600px",
          height: "auto",
          display: "block",
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        <title>StageRoutine Coordinate System</title>

        {/* Stage Canvas Rectangle Outline (Transparent, Flat 1px Border) */}
        <rect
          x="30"
          y="30"
          width="620"
          height="300"
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
        />

        {/* Horizontal & Vertical Center Guides */}
        <line
          x1="30"
          y1="180"
          x2="650"
          y2="180"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />
        <line
          x1="340"
          y1="30"
          x2="340"
          y2="330"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        {/* Center Point (50, 50) */}
        <circle cx="340" cy="180" r="5" fill="#38bdf8" />
        <text
          x="340"
          y="158"
          fill="#ffffff"
          fontSize="17"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          (50, 50)
        </text>
        <text
          x="340"
          y="208"
          fill="#38bdf8"
          fontSize="14"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          anchor: "center"
        </text>

        {/* Top-Left (0, 0) */}
        <circle cx="30" cy="30" r="4" fill="#38bdf8" />
        <text
          x="44"
          y="22"
          fill="#38bdf8"
          fontSize="15"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
        >
          (0, 0){" "}
          <tspan fill="#a1a1aa" fontSize="13" fontWeight="500">
            "top-left"
          </tspan>
        </text>

        {/* Top-Right (100, 0) */}
        <circle cx="650" cy="30" r="4" fill="#ffffff" />
        <text
          x="636"
          y="22"
          fill="#ffffff"
          fontSize="15"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          (100, 0){" "}
          <tspan fill="#a1a1aa" fontSize="13" fontWeight="500">
            "top-right"
          </tspan>
        </text>

        {/* Bottom-Left (0, 100) */}
        <circle cx="30" cy="330" r="4" fill="#ffffff" />
        <text
          x="44"
          y="352"
          fill="#ffffff"
          fontSize="15"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
        >
          (0, 100){" "}
          <tspan fill="#a1a1aa" fontSize="13" fontWeight="500">
            "bottom-left"
          </tspan>
        </text>

        {/* Bottom-Right (100, 100) */}
        <circle cx="650" cy="330" r="4" fill="#ffffff" />
        <text
          x="636"
          y="352"
          fill="#ffffff"
          fontSize="15"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          (100, 100){" "}
          <tspan fill="#a1a1aa" fontSize="13" fontWeight="500">
            "bottom-right"
          </tspan>
        </text>

        {/* Axis Direction Indicators */}
        <text
          x="640"
          y="172"
          fill="#71717a"
          fontSize="13"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          +X →
        </text>
        <text
          x="352"
          y="320"
          fill="#71717a"
          fontSize="13"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
        >
          +Y ↓
        </text>
      </svg>
    </div>
  );
}
