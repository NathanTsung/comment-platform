import React, { useState } from "react";

const CATEGORY_COLORS = {
  APPROVAL_BLOCKER: "#e63946",
  COMPLIANCE: "#d62828",
  MISSING_INFO: "#f77f00",
  TYPE_ERROR: "#fcbf49",
  SCOPE_CHANGE: "#4361ee",
  STRUCTURAL: "#6c757d",
  TECHNICAL_CONTENT: "#457b9d",
  CLARIFICATION: "#8e7cc3",
  ADVISORY: "#2a9d8f",
};

const CATEGORY_LABELS = {
  APPROVAL_BLOCKER: "Approval Blocker",
  COMPLIANCE: "Compliance",
  MISSING_INFO: "Missing Info",
  TYPE_ERROR: "Type Error",
  SCOPE_CHANGE: "Scope Change",
  STRUCTURAL: "Structural",
  TECHNICAL_CONTENT: "Technical Content",
  CLARIFICATION: "Clarification",
  ADVISORY: "Advisory",
};

export { CATEGORY_COLORS, CATEGORY_LABELS };

export default function DonutChart({ data, size = 260, thickness = 32 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - thickness) / 2 - 15;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) return null;

  const segments = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  let cumulativeOffset = 0;

  return (
    <div className="donut-wrapper">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="donut-svg"
      >
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={thickness}
        />

        {segments.map((seg, i) => {
          const segLen = (seg.count / total) * circumference;
          const gap = segments.length > 1 ? 3 : 0;
          const adjustedLen = Math.max(segLen - gap, 1);
          const offset = cumulativeOffset + gap / 2;
          cumulativeOffset += segLen;
          const isHovered = hoveredIndex === i;

          return (
            <circle
              key={seg.name}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={CATEGORY_COLORS[seg.name] || "#999"}
              strokeWidth={isHovered ? thickness + 14 : thickness}
              strokeDasharray={`${adjustedLen} ${circumference - adjustedLen}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                cursor: "pointer",
                transition: "stroke-width 0.25s ease, opacity 0.25s ease",
                opacity: hoveredIndex !== null && !isHovered ? 0.4 : 1,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}

        {/* Center text */}
        {hoveredIndex !== null && segments[hoveredIndex] ? (
          <>
            <text
              x={cx}
              y={cy - 12}
              textAnchor="middle"
              style={{ fontSize: "28px", fontWeight: 700, fill: CATEGORY_COLORS[segments[hoveredIndex].name] }}
            >
              {segments[hoveredIndex].count}
            </text>
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              style={{ fontSize: "11px", fontWeight: 600, fill: "#495057" }}
            >
              {CATEGORY_LABELS[segments[hoveredIndex].name]}
            </text>
            <text
              x={cx}
              y={cy + 22}
              textAnchor="middle"
              style={{ fontSize: "12px", fill: "#6c757d" }}
            >
              {((segments[hoveredIndex].count / total) * 100).toFixed(1)}%
            </text>
          </>
        ) : (
          <>
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              style={{ fontSize: "32px", fontWeight: 700, fill: "#2c3e50" }}
            >
              {total}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              style={{ fontSize: "12px", fill: "#6c757d" }}
            >
              Comments
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div
            key={seg.name}
            className={`donut-legend-item ${hoveredIndex === i ? "legend-active" : ""}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="legend-dot"
              style={{ backgroundColor: CATEGORY_COLORS[seg.name] }}
            />
            <span className="legend-name">
              {CATEGORY_LABELS[seg.name] || seg.name}
            </span>
            <span className="legend-count">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
