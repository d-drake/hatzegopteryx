'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AxisProps {
  scale: d3.ScaleLinear<number, number> | d3.ScaleTime<number, number> | d3.ScaleBand<string>;
  orientation: 'bottom' | 'left' | 'top' | 'right';
  transform?: string;
  label?: string;
  labelOffset: { x: number; y: number }
  gridLines?: boolean;
  gridLineLength?: number;
}

export default function Axis({
  scale,
  orientation,
  transform,
  label,
  labelOffset = { x: 0, y: 0 },
  gridLines = false,
  gridLineLength = 0,
}: AxisProps) {
  const axisRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!axisRef.current) return;

    const axisGenerator = {
      bottom: d3.axisBottom,
      left: d3.axisLeft,
      top: d3.axisTop,
      right: d3.axisRight,
    }[orientation];

    let axis = axisGenerator(scale as any);

    if (gridLines) {
      axis = axis.tickSize(gridLineLength).tickFormat(() => '');
    } else {
      // Auto-reduce tick density to prevent overlapping labels
      const isHorizontal = orientation === 'bottom' || orientation === 'top';
      const isVertical = orientation === 'left' || orientation === 'right';

      const availableSpace = isHorizontal
        ? (scale as any).range()[1] - (scale as any).range()[0]
        : isVertical
          ? Math.abs((scale as any).range()[0] - (scale as any).range()[1])
          : 0;

      if (availableSpace > 0) {
        // Estimate label dimensions with extra padding to prevent overlap
        const estimatedLabelSize = isHorizontal
          ? 100  // Width for date labels like "May 25" with padding
          : 25;  // Height for numeric labels like "100" with padding

        const maxTicks = Math.floor(availableSpace / estimatedLabelSize);

        // Ensure we have at least 2 ticks but not more than would cause overlap
        const tickCount = Math.max(2, Math.min(10, maxTicks));
        axis = axis.ticks(tickCount);
      }
    }

    const axisGroup = d3.select(axisRef.current);
    // Clear existing content to prevent stacking
    axisGroup.selectAll('*').remove();
    axisGroup.call(axis);

    if (gridLines) {
      axisGroup
        .selectAll('.tick line')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.3);
      axisGroup.select('.domain').remove();
    } else {
      // Style the main axis for better visibility
      axisGroup
        .select('.domain')
        .style('stroke', '#64748b'); // slate-500 color
      axisGroup
        .selectAll('.tick line')
        .style('stroke', '#64748b'); // slate-500 color
      axisGroup
        .selectAll('.tick text')
        .style('fill', '#64748b'); // slate-500 color
    }

    if (label && !gridLines) {
      const isVertical = orientation === 'left' || orientation === 'right';

      axisGroup
        .append('text')
        .attr('transform', isVertical ? 'rotate(-90)' : null)
        .attr('x', labelOffset.x)
        .attr('y', labelOffset.y)
        .attr('fill', '#000000')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(label);
    }
  }, [scale, gridLines, gridLineLength, label, labelOffset.x, labelOffset.y, orientation]);

  return <g ref={axisRef} transform={transform} className="axis" />;
}