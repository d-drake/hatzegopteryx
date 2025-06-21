'use client';

import { ReactNode } from 'react';

interface ChartContainerProps {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  children: ReactNode;
}

export default function ChartContainer({ width, height, margin, children }: ChartContainerProps) {
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {children}
      </g>
    </svg>
  );
}

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