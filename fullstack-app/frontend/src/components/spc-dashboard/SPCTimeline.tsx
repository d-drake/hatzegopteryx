'use client';

import Timeline from '@/components/charts/Timeline';
import { SPCCdL1Item, SPCLimit } from '@/services/spcCdL1Service';
import LimitLine from './LimitLine';
import { useSPCLimits } from '@/contexts/SPCLimitsContext';
import { getUnitsForMonitor } from '@/lib/spc-dashboard/unitRegistry';
import * as d3 from 'd3';

interface SPCTimelineProps {
  data: SPCCdL1Item[];
  xField: keyof SPCCdL1Item;
  yField: keyof SPCCdL1Item;
  y2Field?: keyof SPCCdL1Item; // Secondary Y-axis field
  colorField?: keyof SPCCdL1Item;
  shapeField?: keyof SPCCdL1Item;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  processType?: string;
  productType?: string;
  spcMonitorName?: string;
  yScale?: d3.ScaleLinear<number, number>; // External Y scale for synchronization (deprecated)
  onYScaleChange?: (scale: d3.ScaleLinear<number, number>) => void; // Callback when Y scale changes (deprecated)
  allData?: SPCCdL1Item[]; // All data for scale calculation
  xZoomDomain?: [number, number] | [Date, Date] | null; // X-axis zoom domain
  yZoomDomain?: [number, number] | null; // Y-axis zoom domain
  y2ZoomDomain?: [number, number] | null; // Y2-axis zoom domain
  onXZoomChange?: (domain: [number, number] | [Date, Date] | null) => void; // Callback for X zoom
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for Y zoom
  onY2ZoomChange?: (domain: [number, number] | null) => void; // Callback for Y2 zoom
  onResetZoom?: () => void; // Callback for reset zoom
}

export default function SPCTimeline({
  data,
  xField,
  yField,
  y2Field,
  colorField = 'entity',
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
}: SPCTimelineProps) {
  // Use SPC limits from context instead of fetching independently
  const { getLimitsForChart, isLoading: limitsLoading } = useSPCLimits();
  // Apply SPC-specific defaults
  // For bias fields, use bias coloring
  const effectiveColorField = yField.toString().includes('bias') ? yField : colorField;
  
  // For CD ATT charts, use fake_property1 for shapes
  const effectiveShapeField = yField === 'cd_att' ? 'fake_property1' : shapeField;

  // Map yField to chart name for SPC limits
  const getChartName = (field: keyof SPCCdL1Item): string => {
    switch (field) {
      case 'cd_att': return 'cd_att';
      case 'cd_x_y': return 'cd_x_y';
      case 'cd_6sig': return 'cd_6sig';
      case 'bias': return 'bias';
      case 'bias_x_y': return 'bias_x_y';
      default: return field.toString();
    }
  };

  const chartName = getChartName(yField);
  
  // Get limits for this specific chart from the shared context
  const spcLimits = getLimitsForChart(chartName);

  // Create tooltip metadata with current SPC limits
  const tooltipMetadata = spcLimits.length > 0 ? {
    cl: spcLimits[0]?.cl,
    lcl: spcLimits[0]?.lcl,
    ucl: spcLimits[0]?.ucl
  } : undefined;

  return (
    <Timeline<SPCCdL1Item>
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
      unitMapping={getUnitsForMonitor(spcMonitorName || '')}
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