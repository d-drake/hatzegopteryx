"use client";

import Timeline from "@/components/charts/Timeline";
import { SPCLimits } from "@/types";
import LimitLine from "./LimitLine";
import { useSPCLimits } from "@/contexts/SPCLimitsContext";
import { getUnitsForMonitor } from "@/lib/spc-dashboard/unitRegistry";
import { useSPCConfig } from "@/hooks/useSPCConfig";
import {
  getEffectiveColorField,
  getEffectiveShapeField,
} from "@/lib/spc-dashboard/config/field-mapping-utils";
import * as d3 from "d3";

interface SPCTimelineProps {
  data: any[]; // Generic data array
  xField: string;
  yField: string;
  y2Field?: string; // Secondary Y-axis field
  colorField?: string;
  shapeField?: string;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  processType?: string;
  productType?: string;
  spcMonitorName?: string;
  yScale?: d3.ScaleLinear<number, number>; // External Y scale for synchronization (deprecated)
  onYScaleChange?: (scale: d3.ScaleLinear<number, number>) => void; // Callback when Y scale changes (deprecated)
  allData?: any[]; // All data for scale calculation
  xZoomDomain?: [number, number] | [Date, Date] | null; // X-axis zoom domain
  yZoomDomain?: [number, number] | null; // Y-axis zoom domain
  y2ZoomDomain?: [number, number] | null; // Y2-axis zoom domain
  onXZoomChange?: (domain: [number, number] | [Date, Date] | null) => void; // Callback for X zoom
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for Y zoom
  onY2ZoomChange?: (domain: [number, number] | null) => void; // Callback for Y2 zoom
  onResetZoom?: () => void; // Callback for reset zoom
  // Legend selection props
  selectedColorItems?: Set<string>;
  selectedShapeItems?: Set<string>;
  onColorLegendClick?: (label: string) => void;
  onShapeLegendClick?: (label: string) => void;
  onResetLegendSelections?: () => void;
  containerPaddingTop?: number; // Optional padding above the chart container
}

export default function SPCTimeline({
  data,
  xField,
  yField,
  y2Field,
  colorField = "entity",
  shapeField,
  width = 800,
  height = 500,
  margin = { top: 30, right: 240, bottom: 60, left: 70 },
  processType,
  productType,
  spcMonitorName,
  yScale,
  onYScaleChange,
  allData,
  xZoomDomain,
  yZoomDomain,
  y2ZoomDomain,
  onXZoomChange,
  onYZoomChange,
  onY2ZoomChange,
  onResetZoom,
  selectedColorItems,
  selectedShapeItems,
  onColorLegendClick,
  onShapeLegendClick,
  onResetLegendSelections,
  containerPaddingTop = 64, // Default to 64px for SPCChartWrapper's pt-16
}: SPCTimelineProps) {
  // Use SPC limits from context instead of fetching independently
  const { getLimitsForChart, isLoading: limitsLoading } = useSPCLimits();
  
  // Get configuration for this monitor
  const { config } = useSPCConfig(spcMonitorName || "");
  
  // Create context for field mapping rules
  const fieldContext = {
    yField: yField.toString(),
    colorField,
    shapeField,
  };
  
  // Apply configuration-driven field mappings
  const effectiveColorField = getEffectiveColorField(
    config?.fieldMappings,
    fieldContext,
    colorField
  );
  
  const effectiveShapeField = getEffectiveShapeField(
    config?.fieldMappings,
    fieldContext,
    shapeField
  );

  // Map yField to chart name for SPC limits (generic approach)
  const getChartName = (field: string): string => {
    // Simply return the field as-is for chart name mapping
    return field;
  };

  const chartName = getChartName(yField);

  // Get limits for this specific chart from the shared context
  const spcLimits = getLimitsForChart(chartName);

  // Create tooltip metadata with current SPC limits
  const tooltipMetadata =
    spcLimits.length > 0
      ? {
          cl: spcLimits[0]?.cl,
          lcl: spcLimits[0]?.lcl,
          ucl: spcLimits[0]?.ucl,
        }
      : undefined;

  return (
    <Timeline
      data={data}
      xField={xField}
      yField={yField}
      y2Field={y2Field}
      colorField={effectiveColorField}
      shapeField={effectiveShapeField}
      lineGroupField="entity"
      width={width}
      height={height}
      margin={margin}
      tooltipMetadata={tooltipMetadata}
      yScale={yScale}
      onYScaleChange={onYScaleChange}
      allData={allData}
      xZoomDomain={xZoomDomain}
      yZoomDomain={yZoomDomain}
      y2ZoomDomain={y2ZoomDomain}
      onXZoomChange={onXZoomChange}
      onYZoomChange={onYZoomChange}
      onY2ZoomChange={onY2ZoomChange}
      onResetZoom={onResetZoom}
      unitMapping={getUnitsForMonitor(spcMonitorName || "")}
      selectedColorItems={selectedColorItems}
      selectedShapeItems={selectedShapeItems}
      onColorLegendClick={onColorLegendClick}
      onShapeLegendClick={onShapeLegendClick}
      onResetLegendSelections={onResetLegendSelections}
      containerPaddingTop={containerPaddingTop}
      renderOverlays={(scales) => {
        // Only render SPC limits if metadata is available
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
}
