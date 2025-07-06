"use client";

import React from "react";
import { HoverData } from "./hooks/useBoxPlotInteractions";

interface BoxPlotTooltipProps {
  /** The data to display in the tooltip, null means no tooltip */
  hoveredData: HoverData | null;
  /** Current mouse position for tooltip positioning */
  mousePosition: { x: number; y: number } | null;
}

/**
 * Simple tooltip component for displaying hover information
 */
const Tooltip: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
}> = ({ x, y, children }) => {
  return (
    <div
      className="tooltip"
      style={{
        position: "fixed",
        left: x + 10,
        top: y - 10,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "4px",
        fontSize: "12px",
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/**
 * Tooltip component specifically designed for box plot interactions
 * Handles different types of hover data (box, point, mean)
 */
export const BoxPlotTooltip: React.FC<BoxPlotTooltipProps> = ({
  hoveredData,
  mousePosition,
}) => {
  if (!hoveredData || !mousePosition) {
    return null;
  }

  return (
    <Tooltip x={mousePosition.x} y={mousePosition.y}>
      {hoveredData.type === "box" && (
        <>
          <div>Entity: {hoveredData.entity}</div>
          <div>Count: {hoveredData.count}</div>
          <div>Mean: {hoveredData.mean.toFixed(3)}</div>
          <div>Median: {hoveredData.median.toFixed(3)}</div>
          <div>Q1: {hoveredData.q1.toFixed(3)}</div>
          <div>Q3: {hoveredData.q3.toFixed(3)}</div>
          <div>Min: {hoveredData.min.toFixed(3)}</div>
          <div>Max: {hoveredData.max.toFixed(3)}</div>
        </>
      )}
      {hoveredData.type === "point" && (
        <>
          <div>Entity: {hoveredData.entity}</div>
          <div>Value: {hoveredData.value.toFixed(3)}</div>
          {hoveredData.isOutlier && (
            <div style={{ color: "#ff4545" }}>Outlier</div>
          )}
          {hoveredData.lot && <div>Lot: {hoveredData.lot}</div>}
          {hoveredData.date_process && (
            <div>
              Date: {new Date(hoveredData.date_process).toLocaleDateString()}
            </div>
          )}
        </>
      )}
      {hoveredData.type === "mean" && (
        <>
          <div>Entity: {hoveredData.entity}</div>
          <div>Mean: {hoveredData.mean.toFixed(3)}</div>
        </>
      )}
    </Tooltip>
  );
};
