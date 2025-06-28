'use client';

import React from 'react';
import { VariabilityChart } from '../charts/VariabilityChart';
import type { ScaleLinear } from 'd3-scale';

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
}) => {
  // Simply pass through the data - SPCChartWithSharedData handles fetching all entity data
  return (
    <VariabilityChart
      data={data}
      categoricalColumn="entity"
      valueColumn={chartMeasurement}
      width={width}
      height={height}
      margin={margin}
      yScale={yScale}
      onYScaleChange={onYScaleChange}
      yZoomDomain={yZoomDomain}
      onYZoomChange={onYZoomChange}
      onResetZoom={onResetZoom}
    />
  );
};