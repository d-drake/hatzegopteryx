'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface AxisProps {
  scale: d3.ScaleLinear<number, number>;
  orientation: 'bottom' | 'left' | 'top' | 'right';
  transform?: string;
  label?: string;
  labelOffset?: { x: number; y: number };
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

    let axis = axisGenerator(scale);

    if (gridLines) {
      axis = axis.tickSize(gridLineLength).tickFormat(() => '');
    }

    const axisGroup = d3.select(axisRef.current);
    axisGroup.call(axis);

    if (gridLines) {
      axisGroup
        .selectAll('.tick line')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.3);
      axisGroup.select('.domain').remove();
    }

    if (label && !gridLines) {
      const isVertical = orientation === 'left' || orientation === 'right';
      
      axisGroup
        .append('text')
        .attr('transform', isVertical ? 'rotate(-90)' : undefined)
        .attr('x', labelOffset.x)
        .attr('y', labelOffset.y)
        .attr('fill', 'black')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(label);
    }
  }, [scale, orientation, label, labelOffset, gridLines, gridLineLength]);

  return <g ref={axisRef} transform={transform} className="axis" />;
}