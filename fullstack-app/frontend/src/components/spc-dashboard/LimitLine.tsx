'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { SPCLimit } from '@/services/cdDataService';
import { useSPCLimits } from '@/contexts/SPCLimitsContext';

interface LimitLineProps {
  type: 'CL' | 'LCL' | 'UCL';
  yScale: d3.ScaleLinear<number, number>;
  xScale: d3.ScaleLinear<number, number> | d3.ScaleTime<number, number>;
  chartName: string; // e.g., "cd_att"
  processType: string;
  productType: string;
  spcMonitorName: string;
}

export default function LimitLine({
  type,
  yScale,
  xScale,
  chartName,
  processType,
  productType,
  spcMonitorName
}: LimitLineProps) {
  // Use SPC limits from context instead of fetching independently
  const { getLimitsForChart, isLoading: loading } = useSPCLimits();
  const limits = getLimitsForChart(chartName);

  // Process limits data to create step function path
  const pathData = useMemo(() => {
    if (!limits.length) return null;

    // Filter limits for the specific type and sort by effective date
    const relevantLimits = limits
      .filter(limit => {
        const value = type === 'CL' ? limit.cl : type === 'LCL' ? limit.lcl : limit.ucl;
        if (value === undefined || value === null) return false;
        
        // Check if the limit value is within the current Y domain (zoom boundaries)
        const [yMin, yMax] = yScale.domain();
        return value >= yMin && value <= yMax;
      })
      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

    if (!relevantLimits.length) return null;

    // Get the chart boundaries - limit lines should span from Y-axis to right edge
    const xRange = xScale.range();
    const innerStartX = Array.isArray(xRange) ? Math.min(...xRange) : 0;
    const innerEndX = Array.isArray(xRange) ? Math.max(...xRange) : 100;
    
    // Bypass the 30px margins - extend lines fully to the axes
    // Start at the Y-axis (0) and extend to the full width
    const startX = 0; // Start at the left Y-axis
    const endX = innerEndX; // Extend to the right edge (or secondary Y-axis)

    // For SPC limits, we typically want simple horizontal lines across the full width
    // Use only the most recent (last) limit value to avoid complexity
    const mostRecentLimit = relevantLimits[relevantLimits.length - 1];
    const value = type === 'CL' ? mostRecentLimit.cl! : type === 'LCL' ? mostRecentLimit.lcl! : mostRecentLimit.ucl!;
    const yPos = yScale(value);
    
    // Create a simple horizontal line from start to end
    // This eliminates any path complexity that could cause artifacts
    const pathSegments = [
      `M ${startX} ${yPos}`,  // Move to start position
      `L ${endX} ${yPos}`     // Draw horizontal line to end
    ];

    return pathSegments.join(' ');
  }, [limits, type, xScale, yScale]);

  // Return null if no data or still loading
  if (loading || !pathData) {
    return null;
  }

  // Define line styling based on type
  const getLineStyle = () => {
    switch (type) {
      case 'CL':
        return {
          stroke: '#6b7280', // gray
          strokeDasharray: '5,5', // dotted
          strokeOpacity: 1,
          strokeWidth: 1.5
        };
      case 'LCL':
      case 'UCL':
        return {
          stroke: '#ef4444', // red
          strokeDasharray: '10,5', // dashed
          strokeOpacity: 0.7, // transparent
          strokeWidth: 1.5
        };
      default:
        return {
          stroke: '#6b7280',
          strokeOpacity: 1,
          strokeWidth: 1
        };
    }
  };

  const lineStyle = getLineStyle();

  // Return the path element directly
  // Y-coordinates are already constrained by the scale's domain/range
  return (
    <path
      d={pathData}
      fill="none"
      stroke={lineStyle.stroke}
      strokeDasharray={lineStyle.strokeDasharray}
      strokeOpacity={lineStyle.strokeOpacity}
      strokeWidth={lineStyle.strokeWidth}
      className="limit-line"
    />
  );
}