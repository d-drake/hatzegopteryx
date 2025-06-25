'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface CirclesProps<T> {
  data: T[];
  xAccessor: (d: T) => number;
  yAccessor: (d: T) => number;
  colorAccessor?: (d: T) => string;
  colorScale?: d3.ScaleOrdinal<string, string>;
  radius?: number;
  opacity?: number;
  strokeWidth?: number;
  strokeColor?: string;
  onHover?: (event: MouseEvent, datum: T | null) => void;
  selectedColorItems?: Set<string>;
}

export default function Circles<T>({
  data,
  xAccessor,
  yAccessor,
  colorAccessor,
  colorScale,
  radius = 4,
  opacity = 0.7,
  strokeWidth = 0.5,
  strokeColor = 'white',
  onHover,
  selectedColorItems,
}: CirclesProps<T>) {
  const gRef = useRef<SVGGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);
    
    // Clear previous circles
    g.selectAll('.circle').remove();

    // Add circles
    const circles = g
      .selectAll('.circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', xAccessor)
      .attr('cy', yAccessor)
      .attr('r', radius)
      .style('fill', d => {
        if (colorScale && colorAccessor) {
          return colorScale(colorAccessor(d));
        }
        return '#3b82f6'; // default blue
      })
      .style('opacity', d => {
        // Apply selection transparency
        if (selectedColorItems && selectedColorItems.size > 0 && colorAccessor) {
          const colorValue = colorAccessor(d);
          return selectedColorItems.has(colorValue) ? opacity : opacity * 0.3;
        }
        return opacity;
      })
      .style('stroke', strokeColor)
      .style('stroke-width', strokeWidth)
      .style('cursor', 'pointer');

    // Add hover interactions
    circles
      .on('mouseover', function(event, d) {
        const index = data.indexOf(d);
        setHoveredIndex(index);
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', radius * 1.5)
          .style('opacity', 1);
        if (onHover) onHover(event, d);
      })
      .on('mouseout', function(event, d) {
        setHoveredIndex(null);
        d3.select(this)
          .transition()
          .duration(100)
          .attr('r', radius)
          .style('opacity', () => {
            // Restore the selection-based opacity
            if (selectedColorItems && selectedColorItems.size > 0 && colorAccessor) {
              const colorValue = colorAccessor(d);
              return selectedColorItems.has(colorValue) ? opacity : opacity * 0.3;
            }
            return opacity;
          });
        if (onHover) onHover(event, null);
      });
  }, [data, xAccessor, yAccessor, colorAccessor, colorScale, radius, opacity, strokeWidth, strokeColor, onHover, selectedColorItems]);

  return <g ref={gRef} className="circles" />;
}