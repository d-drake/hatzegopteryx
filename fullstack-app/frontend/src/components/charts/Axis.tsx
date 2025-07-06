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
  tickRotation?: number; // Rotation angle for tick labels
  checkOverlap?: boolean; // Whether to check for tick label overlap
  responsive?: boolean; // Enable responsive features
  screenWidth?: number; // Current screen width for responsive adjustments
}

export default function Axis({
  scale,
  orientation,
  transform,
  label,
  labelOffset = { x: 0, y: 0 },
  gridLines = false,
  gridLineLength = 0,
  tickRotation,
  checkOverlap = false,
  responsive = false,
  screenWidth = 800,
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
        // For narrow screens, use smaller label size estimates
        const isNarrowScreen = responsive && screenWidth < 800;
        const estimatedLabelSize = isHorizontal
          ? (isNarrowScreen ? 50 : 100)  // Width for date labels with responsive sizing
          : 25;  // Height for numeric labels like "100" with padding

        const maxTicks = Math.floor(availableSpace / estimatedLabelSize);

        // Ensure we have at least 2 ticks but not more than would cause overlap
        // For very narrow screens (< 400px), allow more ticks with minimum spacing
        const minTicks = screenWidth < 400 ? 3 : 2;
        const tickCount = Math.max(minTicks, Math.min(10, maxTicks));
        
        // For right axis with potentially small ranges, be more conservative
        if (orientation === 'right') {
          const domain = scale.domain ? scale.domain() : [0, 1];
          const range = Math.abs(Number(domain[1]) - Number(domain[0]));
          // If range is very small, reduce tick count to avoid duplicates
          if (range < 0.1) {
            axis = axis.ticks(Math.min(3, tickCount));
          } else if (range < 1) {
            axis = axis.ticks(Math.min(5, tickCount));
          } else {
            axis = axis.ticks(tickCount);
          }
        } else {
          axis = axis.ticks(tickCount);
        }
      }
    }

    const axisGroup = d3.select(axisRef.current);
    // Clear existing content to prevent stacking
    axisGroup.selectAll('*').remove();
    
    // Apply responsive tick formatting if enabled
    if (responsive && screenWidth < 800) {
      const isHorizontal = orientation === 'bottom' || orientation === 'top';
      
      if (isHorizontal && scale.domain) {
        // Check if it's a time scale
        const domain = scale.domain();
        if (domain[0] instanceof Date) {
          // Use shorter date format for narrow screens
          axis = axis.tickFormat((d: any) => d3.timeFormat('%-m/%-d')(d as Date));
        }
      } else if (!isHorizontal) {
        // Format numbers with abbreviations for Y axes
        axis = axis.tickFormat((d: any) => {
          const num = Number(d);
          if (Math.abs(num) >= 10000) {
            return d3.format('.2s')(num); // e.g., "12k" for 12000
          } else if (Math.abs(num) >= 1000) {
            return d3.format('.3s')(num); // e.g., "1.23k" for 1230
          }
          // For smaller numbers, use appropriate precision
          if (Math.abs(num) < 1) {
            return d3.format('.3~f')(num); // Up to 3 decimal places
          } else if (Math.abs(num) < 10) {
            return d3.format('.3~f')(num); // Up to 3 decimal places for consistency
          }
          return d3.format('.1~f')(num); // Up to 1 decimal place
        });
      }
    }
    
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
        .style('fill', '#64748b') // slate-500 color
        .style('font-size', responsive && screenWidth < 800 ? '10px' : '12px');
        
      // Apply tick rotation if specified
      if (tickRotation) {
        const isBottomAxis = orientation === 'bottom';
        axisGroup
          .selectAll('.tick text')
          .attr('transform', `rotate(${tickRotation})`)
          .style('text-anchor', tickRotation > 0 ? 'start' : 'end')
          .attr('dx', tickRotation > 0 ? '0.8em' : '-0.8em')
          .attr('dy', isBottomAxis ? '0.15em' : '0');
      }
      
      // Check for overlap and rotate if needed
      if (checkOverlap && !tickRotation && (orientation === 'bottom' || orientation === 'top')) {
        const tickTexts = axisGroup.selectAll('.tick text').nodes() as SVGTextElement[];
        let hasOverlap = false;
        
        // Check if any labels overlap
        for (let i = 0; i < tickTexts.length - 1; i++) {
          const bbox1 = tickTexts[i].getBoundingClientRect();
          const bbox2 = tickTexts[i + 1].getBoundingClientRect();
          
          if (bbox1.right > bbox2.left) {
            hasOverlap = true;
            break;
          }
        }
        
        // If overlap detected, rotate labels 45 degrees
        if (hasOverlap) {
          axisGroup
            .selectAll('.tick text')
            .attr('transform', 'rotate(45)')
            .style('text-anchor', 'start')
            .attr('dx', '0.8em')
            .attr('dy', orientation === 'bottom' ? '0.15em' : '0');
        }
      }
    }

    if (label && !gridLines) {
      const isVertical = orientation === 'left' || orientation === 'right';
      const isNarrowScreen = responsive && screenWidth < 800;
      
      // Determine label position and styling based on orientation and screen size
      let labelX = labelOffset.x;
      let labelY = labelOffset.y;
      let rotation = isVertical ? 'rotate(-90)' : null;
      let textAnchor = 'middle';
      let fontSize = isNarrowScreen ? '12px' : '14px';
      
      // Reposition labels on narrow screens to avoid collisions
      if (isNarrowScreen) {
        if (orientation === 'left') {
          // Move to top-left corner, horizontal text
          labelX = 0;
          labelY = -5;
          rotation = null;
          textAnchor = 'start';
        } else if (orientation === 'right') {
          // Move to top of right axis, horizontal text extending toward center
          // Since the right axis is transformed to the right edge, we need negative X to go left
          labelX = -50; // Move 50px left from the right axis into the chart area
          labelY = -20; // Position higher than left axis label (-5) to avoid collision
          rotation = null;
          textAnchor = 'middle'; // Center the text at this position
        } else if (orientation === 'bottom') {
          // Increase offset to avoid tick labels
          labelY = labelOffset.y + 20;
        }
      }

      axisGroup
        .append('text')
        .attr('transform', rotation)
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('fill', '#000000')
        .style('text-anchor', textAnchor)
        .style('font-size', fontSize)
        .text(label);
    }
  }, [scale, gridLines, gridLineLength, label, labelOffset.x, labelOffset.y, orientation, tickRotation, checkOverlap, responsive, screenWidth]);

  return <g ref={axisRef} transform={transform} className="axis" />;
}