"use client";

import { useMemo } from "react";

export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AxisRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  cursor: "ew-resize" | "ns-resize" | "default";
}

export interface ChartDimensions {
  // Basic dimensions
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: Margin;

  // Axis regions (these ARE the zoom areas)
  axisRegions: {
    bottom?: AxisRegion; // X-axis
    left?: AxisRegion; // Y-axis
    right?: AxisRegion; // Y2-axis
    top?: AxisRegion; // Future use
  };

  // Chart content area (where data is rendered)
  contentArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Configuration constants
  config: {
    axisGap: number; // Gap between axis line and zoom area (5px)
    y2AxisWidth: number; // Fixed width for Y2 axis zoom area (60px)
    minZoomAreaHeight: number; // Minimum height for zoom areas (15px)
  };

  // Coordinate conversion functions
  screenToChart: (
    screenX: number,
    screenY: number,
    svgRect: DOMRect,
  ) => { x: number; y: number };
  getAxisRegion: (
    chartX: number,
    chartY: number,
  ) => "bottom" | "left" | "right" | null;
}

export function useChartDimensions(
  width: number,
  height: number,
  margin: Margin,
  options: {
    hasY2Axis?: boolean;
    axisGap?: number;
    y2AxisWidth?: number;
    minZoomAreaHeight?: number;
  } = {},
): ChartDimensions {
  return useMemo(() => {
    // Configuration with defaults
    const config = {
      axisGap: options.axisGap ?? 5,
      y2AxisWidth: options.y2AxisWidth ?? 60,
      minZoomAreaHeight: options.minZoomAreaHeight ?? 15,
    };

    // Basic dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define axis regions (in chart coordinate system)
    const axisRegions: ChartDimensions["axisRegions"] = {};

    // Bottom axis (X-axis) - below the chart
    axisRegions.bottom = {
      x: 0,
      y: innerHeight + config.axisGap,
      width: innerWidth,
      height: Math.max(
        margin.bottom - config.axisGap,
        config.minZoomAreaHeight,
      ),
      cursor: "ew-resize" as const,
    };

    // Left axis (Y-axis) - to the left of the chart
    axisRegions.left = {
      x: -margin.left + config.axisGap,
      y: 0,
      width: margin.left - 2 * config.axisGap,
      height: innerHeight,
      cursor: "ns-resize" as const,
    };

    // Right axis (Y2-axis) - to the right of the chart (if enabled)
    if (options.hasY2Axis) {
      axisRegions.right = {
        x: innerWidth + config.axisGap,
        y: 0,
        width: config.y2AxisWidth,
        height: innerHeight,
        cursor: "ns-resize" as const,
      };
    }

    // Chart content area (where data is rendered)
    const contentArea = {
      x: 0,
      y: 0,
      width: innerWidth,
      height: innerHeight,
    };

    // Coordinate conversion function that accounts for SVG scaling
    const screenToChart = (
      screenX: number,
      screenY: number,
      svgRect: DOMRect,
    ) => {
      // Calculate SVG scale factors
      const scaleX = width / svgRect.width;
      const scaleY = height / svgRect.height;

      // Convert screen coordinates to SVG coordinates
      const svgX = (screenX - svgRect.left) * scaleX;
      const svgY = (screenY - svgRect.top) * scaleY;

      // Convert SVG coordinates to chart coordinates (accounting for margin transform)
      return {
        x: svgX - margin.left,
        y: svgY - margin.top,
      };
    };

    // Function to determine which axis region a point is in
    const getAxisRegion = (
      chartX: number,
      chartY: number,
    ): "bottom" | "left" | "right" | null => {
      // Check bottom axis
      if (
        axisRegions.bottom &&
        chartX >= axisRegions.bottom.x &&
        chartX <= axisRegions.bottom.x + axisRegions.bottom.width &&
        chartY >= axisRegions.bottom.y &&
        chartY <= axisRegions.bottom.y + axisRegions.bottom.height
      ) {
        return "bottom";
      }

      // Check left axis
      if (
        axisRegions.left &&
        chartX >= axisRegions.left.x &&
        chartX <= axisRegions.left.x + axisRegions.left.width &&
        chartY >= axisRegions.left.y &&
        chartY <= axisRegions.left.y + axisRegions.left.height
      ) {
        return "left";
      }

      // Check right axis
      if (
        axisRegions.right &&
        chartX >= axisRegions.right.x &&
        chartX <= axisRegions.right.x + axisRegions.right.width &&
        chartY >= axisRegions.right.y &&
        chartY <= axisRegions.right.y + axisRegions.right.height
      ) {
        return "right";
      }

      return null;
    };

    return {
      width,
      height,
      innerWidth,
      innerHeight,
      margin,
      axisRegions,
      contentArea,
      config,
      screenToChart,
      getAxisRegion,
    };
  }, [
    width,
    height,
    margin,
    options.hasY2Axis,
    options.axisGap,
    options.y2AxisWidth,
    options.minZoomAreaHeight,
  ]);
}

// Re-export the simpler version for backward compatibility
export function useChartDimensionsSimple(
  width: number,
  height: number,
  margin: Margin,
) {
  return {
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
    width,
    height,
    margin,
  };
}
