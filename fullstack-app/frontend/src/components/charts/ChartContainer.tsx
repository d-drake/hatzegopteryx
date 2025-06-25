'use client';

import { ReactNode, forwardRef } from 'react';

interface ChartContainerProps {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  children: ReactNode;
  onWheel?: (event: React.WheelEvent<SVGSVGElement>) => void;
}

const ChartContainer = forwardRef<SVGSVGElement, ChartContainerProps>(
  ({ width, height, margin, children, onWheel }, ref) => {
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    return (
      <div data-testid="chart-container" className="chart-container">
        <svg ref={ref} width={width} height={height} onWheel={onWheel}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {children}
          </g>
        </svg>
      </div>
    );
  }
);

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;

export function useChartDimensions(
  width: number,
  height: number,
  margin: { top: number; right: number; bottom: number; left: number }
) {
  return {
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom,
    width,
    height,
    margin,
  };
}