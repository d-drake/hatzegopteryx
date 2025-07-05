'use client';

import { ReactNode, forwardRef } from 'react';

interface ChartContainerProps {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  children: ReactNode;
  onWheel?: (event: React.WheelEvent<SVGSVGElement>) => void;
  responsive?: boolean;
  preserveAspectRatio?: string;
}

const ChartContainer = forwardRef<SVGSVGElement, ChartContainerProps>(
  ({ width, height, margin, children, onWheel, responsive = false, preserveAspectRatio = 'xMinYMid meet' }, ref) => {
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Always use responsive SVG properties for better scaling
    const svgProps = {
      viewBox: `0 0 ${width} ${height}`,
      preserveAspectRatio,
      style: {
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
      },
    };

    return (
      <svg ref={ref} {...svgProps} onWheel={onWheel}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {children}
        </g>
      </svg>
    );
  }
);

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;

// Re-export the simple version for backward compatibility
export { useChartDimensionsSimple as useChartDimensions } from '../../hooks/useChartDimensions';
// Export the new enhanced version
export { useChartDimensions as useEnhancedChartDimensions, type ChartDimensions, type AxisRegion } from '../../hooks/useChartDimensions';