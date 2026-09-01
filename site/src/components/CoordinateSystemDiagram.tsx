import type React from "react";

export function CoordinateSystemDiagram(): React.JSX.Element {
  return (
    <div style={{ textAlign: "center", margin: "2.5rem 0" }}>
      <svg
        role="img"
        aria-label="StageRoutine Coordinate System"
        viewBox="0 0 760 400"
        width="100%"
        style={{
          maxWidth: "680px",
          height: "auto",
          display: "block",
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        <title>StageRoutine Coordinate System</title>

        {/* Stage Canvas Rectangle Outline (Transparent, Flat 1.5px Border) */}
        <rect
          x="80"
          y="50"
          width="600"
          height="300"
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
        />

        {/* Horizontal & Vertical Center Guides */}
        <line
          x1="80"
          y1="200"
          x2="680"
          y2="200"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />
        <line
          x1="380"
          y1="50"
          x2="380"
          y2="350"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        {/* Center Point (50, 50) */}
        <circle cx="380" cy="200" r="5" fill="#38bdf8" />
        <text
          x="380"
          y="180"
          fill="#ffffff"
          fontSize="16"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          (50, 50)
        </text>
        <text
          x="380"
          y="228"
          fill="#38bdf8"
          fontSize="14"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          "center"
        </text>

        {/* Top-Left (0, 0) */}
        <circle cx="80" cy="50" r="4" fill="#38bdf8" />
        <text
          x="80"
          y="32"
          fill="#38bdf8"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="start"
        >
          (0, 0){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "top-left"
          </tspan>
        </text>

        {/* Top (50, 0) */}
        <circle cx="380" cy="50" r="4" fill="#ffffff" />
        <text
          x="380"
          y="32"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          (50, 0){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "top"
          </tspan>
        </text>

        {/* Top-Right (100, 0) */}
        <circle cx="680" cy="50" r="4" fill="#ffffff" />
        <text
          x="680"
          y="32"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          (100, 0){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "top-right"
          </tspan>
        </text>

        {/* Left (0, 50) */}
        <circle cx="80" cy="200" r="4" fill="#ffffff" />
        <text
          x="70"
          y="196"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          (0, 50)
        </text>
        <text
          x="70"
          y="214"
          fill="#a1a1aa"
          fontSize="12"
          fontWeight="500"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          "left"
        </text>

        {/* Right (100, 50) */}
        <circle cx="680" cy="200" r="4" fill="#ffffff" />
        <text
          x="690"
          y="196"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="start"
        >
          (100, 50)
        </text>
        <text
          x="690"
          y="214"
          fill="#a1a1aa"
          fontSize="12"
          fontWeight="500"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="start"
        >
          "right"
        </text>

        {/* Bottom-Left (0, 100) */}
        <circle cx="80" cy="350" r="4" fill="#ffffff" />
        <text
          x="80"
          y="378"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="start"
        >
          (0, 100){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "bottom-left"
          </tspan>
        </text>

        {/* Bottom (50, 100) */}
        <circle cx="380" cy="350" r="4" fill="#ffffff" />
        <text
          x="380"
          y="378"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="middle"
        >
          (50, 100){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "bottom"
          </tspan>
        </text>

        {/* Bottom-Right (100, 100) */}
        <circle cx="680" cy="350" r="4" fill="#ffffff" />
        <text
          x="680"
          y="378"
          fill="#ffffff"
          fontSize="14"
          fontWeight="700"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          (100, 100){" "}
          <tspan fill="#a1a1aa" fontSize="12" fontWeight="500">
            "bottom-right"
          </tspan>
        </text>

        {/* Axis Direction Indicators */}
        <text
          x="670"
          y="185"
          fill="#71717a"
          fontSize="12"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          textAnchor="end"
        >
          +X →
        </text>
        <text
          x="392"
          y="335"
          fill="#71717a"
          fontSize="12"
          fontWeight="600"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
        >
          +Y ↓
        </text>
      </svg>
    </div>
  );
}
