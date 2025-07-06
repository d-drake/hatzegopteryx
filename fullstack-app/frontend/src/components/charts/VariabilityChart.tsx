"use client";

import React, { useEffect, useRef, useMemo, useId } from "react";
import * as d3 from "d3";
import Axis from "./Axis";
import ChartContainer from "./ChartContainer";
import ZoomControls from "./ZoomControls";
import { BoxPlotRenderer } from "./BoxPlotRenderer";
import { BoxPlotTooltip } from "./BoxPlotTooltip";
import { useBoxPlotStatistics } from "./hooks/useBoxPlotStatistics";
import { useBoxPlotZoom } from "./hooks/useBoxPlotZoom";
import { useBoxPlotInteractions } from "./hooks/useBoxPlotInteractions";
import {
  formatTimelineFieldName,
  UnitMapping,
} from "@/lib/formatters/fieldFormatter";

interface DataPoint {
  [key: string]: any;
}

interface VariabilityChartProps {
  data: DataPoint[];
  categoricalColumn: string;
  valueColumn: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yScale?: d3.ScaleLinear<number, number>; // Deprecated
  onYScaleChange?: (scale: d3.ScaleLinear<number, number>) => void; // Deprecated
  yZoomDomain?: [number, number] | null; // Zoom domain from parent
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for zoom changes
  onResetZoom?: () => void; // Callback for reset zoom
  isSideBySide?: boolean; // Whether chart is in side-by-side layout
  renderOverlays?: (scales: {
    xScale: d3.ScaleBand<string>;
    yScale: d3.ScaleLinear<number, number>;
  }) => React.ReactNode;
  unitMapping?: UnitMapping; // Optional unit mapping for field formatting
}

export const VariabilityChart: React.FC<VariabilityChartProps> = ({
  data,
  categoricalColumn,
  valueColumn,
  width,
  height,
  margin = { top: 20, right: 50, bottom: 80, left: 80 },
  yScale: externalYScale,
  onYScaleChange,
  yZoomDomain,
  onYZoomChange,
  onResetZoom,
  isSideBySide = false,
  renderOverlays,
  unitMapping,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Format field names for axis labels using unit mapping
  const formatFieldName = (field: string): string => {
    return formatTimelineFieldName(field, unitMapping);
  };

  // Track if SVG width is narrow (< 800px)
  const isNarrowSVG = width < 800;

  // Adjust margins for narrow SVGs
  const responsiveMargin = useMemo(
    () => (isNarrowSVG ? { top: 40, right: 10, bottom: 80, left: 50 } : margin),
    [isNarrowSVG, margin],
  );

  const chartWidth = width - responsiveMargin.left - responsiveMargin.right;
  const chartHeight = height - responsiveMargin.top - responsiveMargin.bottom;

  // Use custom hooks for box plot functionality
  const boxPlotData = useBoxPlotStatistics(
    data,
    categoricalColumn,
    valueColumn,
  );

  // Get original Y extent for zoom calculations
  const originalYExtent = useMemo(() => {
    const allValues = boxPlotData.flatMap((d) => d.values);
    if (allValues.length === 0) {
      return [0, 1] as [number, number];
    }
    return d3.extent(allValues) as [number, number];
  }, [boxPlotData]);

  // Use zoom hook for Y-axis zoom functionality
  const { zoomDomain, currentExtent, resetZoom, setupZoomListeners } =
    useBoxPlotZoom({
      initialZoomDomain: yZoomDomain,
      originalExtent: originalYExtent,
      chartHeight,
      responsiveMargin,
      onZoomChange: onYZoomChange,
      onScaleChange: onYScaleChange,
    });

  // Use interaction hook for hover management
  const {
    hoveredData,
    mousePosition,
    setBoxHover,
    setPointHover,
    setMeanHover,
    clearHover,
  } = useBoxPlotInteractions();

  // Create scales
  const xScale = useMemo(() => {
    return d3
      .scaleBand()
      .domain(boxPlotData.map((d) => d.entity))
      .range([0, chartWidth])
      .padding(0.2);
  }, [boxPlotData, chartWidth]);

  // Use external scale domain if provided, otherwise use current extent from zoom hook
  const effectiveYExtent = externalYScale
    ? (externalYScale.domain() as [number, number])
    : currentExtent;

  const yScale = useMemo(() => {
    const scale = d3
      .scaleLinear()
      .domain(effectiveYExtent)
      .range([chartHeight, 0])
      .nice();
    return scale;
  }, [effectiveYExtent, chartHeight]);

  // Notify parent of initial scale creation (deprecated - for backward compatibility)
  useEffect(() => {
    if (!externalYScale && onYScaleChange && yScale) {
      onYScaleChange(yScale);
    }
  }, [yScale, externalYScale, onYScaleChange]);

  // Setup zoom event listeners
  useEffect(() => {
    return setupZoomListeners(svgRef.current);
  }, [setupZoomListeners]);

  const chartId = useId();

  // Calculate zoom level
  const yZoomLevel = zoomDomain
    ? (originalYExtent[1] - originalYExtent[0]) /
      (zoomDomain[1] - zoomDomain[0])
    : 1;

  // Reset zoom function
  const handleResetZoom = () => {
    if (onResetZoom) {
      onResetZoom();
    } else {
      resetZoom();
    }
  };

  return (
    <div
      className="variability-chart-container"
      data-chart-id={chartId}
      style={{ position: "relative" }}
    >
      {/* Zoom controls */}
      <ZoomControls yZoomLevel={yZoomLevel} onResetZoom={handleResetZoom} />

      <ChartContainer
        ref={svgRef}
        width={width}
        height={height + 30}
        margin={responsiveMargin}
      >
        <defs>
          <clipPath id="variability-clip">
            <rect x={0} y={0} width={chartWidth} height={chartHeight} />
          </clipPath>
        </defs>
        {/* Spacer to align with Timeline chart */}
        <rect x={0} y={-10} width={width} height={40} fill="transparent" />
        <g transform="translate(0, 30)">
          <g className="chart-area data-area" clipPath="url(#variability-clip)">
            <BoxPlotRenderer
              data={data}
              boxPlotData={boxPlotData}
              categoricalColumn={categoricalColumn}
              valueColumn={valueColumn}
              xScale={xScale}
              yScale={yScale}
              chartHeight={chartHeight}
              onBoxHover={setBoxHover}
              onPointHover={setPointHover}
              onMeanHover={setMeanHover}
              onHoverClear={clearHover}
            />
          </g>
          {/* Render overlays (e.g., SPC limit lines) */}
          {renderOverlays && (
            <g className="chart-overlays" clipPath="url(#variability-clip)">
              {renderOverlays({ xScale, yScale })}
            </g>
          )}
          <Axis
            scale={yScale}
            orientation="left"
            transform={`translate(0,0)`}
            label={formatFieldName(valueColumn)}
            labelOffset={{ x: -chartHeight / 2, y: -50 }}
            responsive={isNarrowSVG}
            screenWidth={width}
          />
          <Axis
            scale={xScale}
            orientation="bottom"
            transform={`translate(0,${chartHeight})`}
            label={formatFieldName(categoricalColumn)}
            labelOffset={{ x: chartWidth / 2, y: isNarrowSVG ? 45 : 45 }}
            checkOverlap={true}
            responsive={isNarrowSVG}
            screenWidth={width}
          />

          {/* Y-axis zoom area */}
          <rect
            x={-responsiveMargin.left}
            y={0}
            width={responsiveMargin.left}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: "ns-resize" }}
          />
        </g>
      </ChartContainer>

      <BoxPlotTooltip hoveredData={hoveredData} mousePosition={mousePosition} />
    </div>
  );
};
