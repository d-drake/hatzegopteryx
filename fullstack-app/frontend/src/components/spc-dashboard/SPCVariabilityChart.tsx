"use client";

import React from "react";
import { VariabilityChart } from "../charts/VariabilityChart";
import LimitLine from "./LimitLine";
import { useSPCLimits } from "@/contexts/SPCLimitsContext";
import { getUnitsForMonitor } from "@/lib/spc-dashboard/unitRegistry";
import type { ScaleLinear, ScaleBand } from "d3-scale";

interface SPCVariabilityChartProps {
  data: any[];
  chartMeasurement: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yScale?: ScaleLinear<number, number>; // Deprecated
  onYScaleChange?: (scale: ScaleLinear<number, number>) => void; // Deprecated
  yZoomDomain?: [number, number] | null; // Zoom domain from parent
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for zoom changes
  onResetZoom?: () => void; // Callback for reset zoom
  isSideBySide?: boolean; // Whether chart is in side-by-side layout
  processType?: string;
  productType?: string;
  spcMonitorName?: string;
}

export const SPCVariabilityChart: React.FC<SPCVariabilityChartProps> = ({
  data,
  chartMeasurement,
  width,
  height,
  margin = { top: 20, right: 50, bottom: 80, left: 80 },
  yScale,
  onYScaleChange,
  yZoomDomain,
  onYZoomChange,
  onResetZoom,
  isSideBySide = false,
  processType,
  productType,
  spcMonitorName,
}) => {
  // Use SPC limits from context
  const { getLimitsForChart } = useSPCLimits();

  // Adjust margin for side-by-side mode
  // In side-by-side mode, remove the right margin (240px) allocated for legend
  const adjustedMargin = isSideBySide ? { ...margin, right: 0 } : margin;

  // Map chartMeasurement to chart name for SPC limits (same as SPCTimeline)
  const getChartName = (field: string): string => {
    switch (field) {
      case "cd_att":
        return "cd_att";
      case "cd_x_y":
        return "cd_x_y";
      case "cd_6sig":
        return "cd_6sig";
      case "bias":
        return "bias";
      case "bias_x_y":
        return "bias_x_y";
      default:
        return field;
    }
  };

  const chartName = getChartName(chartMeasurement);

  // Simply pass through the data - SPCChartWithSharedData handles fetching all entity data
  return (
    <VariabilityChart
      data={data}
      categoricalColumn="entity"
      valueColumn={chartMeasurement}
      width={width}
      height={height}
      margin={adjustedMargin}
      yScale={yScale}
      onYScaleChange={onYScaleChange}
      yZoomDomain={yZoomDomain}
      onYZoomChange={onYZoomChange}
      onResetZoom={onResetZoom}
      isSideBySide={isSideBySide}
      unitMapping={getUnitsForMonitor(spcMonitorName || "")}
      renderOverlays={(scales) => {
        // Only render SPC limits if all required props are available
        if (!processType || !productType || !spcMonitorName) {
          return null;
        }

        return (
          <>
            <LimitLine
              type="CL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
            <LimitLine
              type="LCL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
            <LimitLine
              type="UCL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
          </>
        );
      }}
    />
  );
};
