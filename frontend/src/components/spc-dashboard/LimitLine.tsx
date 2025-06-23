'use client';

import { useMemo, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { fetchSPCLimits, SPCLimit } from '@/services/cdDataService';

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
  const [limits, setLimits] = useState<SPCLimit[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch SPC limits data
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setLoading(true);
        const limitsData = await fetchSPCLimits({
          process_type: processType,
          product_type: productType,
          spc_monitor_name: spcMonitorName,
          spc_chart_name: chartName
        });
        setLimits(limitsData);
      } catch (error) {
        console.error('Error fetching SPC limits:', error);
        setLimits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [processType, productType, spcMonitorName, chartName, type]);

  // Process limits data to create step function path
  const pathData = useMemo(() => {
    if (!limits.length) return null;

    // Filter limits for the specific type and sort by effective date
    const relevantLimits = limits
      .filter(limit => {
        const value = type === 'CL' ? limit.cl : type === 'LCL' ? limit.lcl : limit.ucl;
        return value !== undefined && value !== null;
      })
      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime());

    if (!relevantLimits.length) return null;

    // Get the chart boundaries - limit lines should span from Y-axis to right edge
    const xRange = xScale.range();
    const innerStartX = Array.isArray(xRange) ? Math.min(...xRange) : 0;
    const innerEndX = Array.isArray(xRange) ? Math.max(...xRange) : 100;
    
    // Start at the inner chart area (Y-axis position) and extend to right edge
    const startX = innerStartX; // Don't extend past the Y-axis
    const endX = innerEndX;     // Use inner end to stay within chart bounds

    // Create step function path
    const pathSegments: string[] = [];
    
    for (let i = 0; i < relevantLimits.length; i++) {
      const limit = relevantLimits[i];
      const value = type === 'CL' ? limit.cl! : type === 'LCL' ? limit.lcl! : limit.ucl!;
      const effectiveDate = new Date(limit.effective_date);
      
      // Convert effective date to X coordinate, clamped to chart boundaries
      const rawXPos = typeof xScale === 'function' ? xScale(effectiveDate as any) : startX;
      const xPos = Math.max(startX, Math.min(endX, rawXPos)); // Clamp to chart boundaries
      const yPos = yScale(value);

      if (i === 0) {
        // Start from the beginning of the chart
        pathSegments.push(`M ${startX} ${yPos}`);
        if (xPos > startX) {
          pathSegments.push(`L ${xPos} ${yPos}`);
        }
      } else {
        // Step change: horizontal line to the x position, then vertical to new value
        const prevLimit = relevantLimits[i - 1];
        const prevValue = type === 'CL' ? prevLimit.cl! : type === 'LCL' ? prevLimit.lcl! : prevLimit.ucl!;
        const prevYPos = yScale(prevValue);
        
        // Horizontal line to step point, then vertical step to new value
        pathSegments.push(`L ${xPos} ${prevYPos}`);
        pathSegments.push(`L ${xPos} ${yPos}`);
      }

      // If this is the last limit, extend to the end of the chart
      if (i === relevantLimits.length - 1) {
        pathSegments.push(`L ${endX} ${yPos}`);
      }
    }

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