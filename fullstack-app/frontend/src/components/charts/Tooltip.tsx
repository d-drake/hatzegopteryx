'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TooltipProps {
  content: string | null;
  x: number;
  y: number;
  visible: boolean;
}

export function useTooltip() {
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null>(null);

  useEffect(() => {
    // Create tooltip on mount
    tooltipRef.current = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('font-size', '12px')
      .style('line-height', '1.5');

    // Cleanup on unmount
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, []);

  const showTooltip = (content: string, x: number, y: number) => {
    if (tooltipRef.current) {
      tooltipRef.current
        .html(content)
        .style('left', `${x + 10}px`)
        .style('top', `${y - 28}px`)
        .transition()
        .duration(200)
        .style('opacity', 0.9);
    }
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current
        .transition()
        .duration(500)
        .style('opacity', 0);
    }
  };

  return { showTooltip, hideTooltip };
}

export function formatTooltipContent(
  data: Record<string, any>,
  fields: string[],
  metadata?: Record<string, any>
): string {
  const dataContent = fields
    .map(field => {
      const value = data[field];
      const formattedField = formatFieldName(field);

      if (value === null || value === undefined) {
        return null; // Skip null/undefined values
      }

      if (typeof value === 'number') {
        return `<strong>${formattedField}:</strong> ${value.toFixed(3)}`;
      } else if (field === 'date_process' && typeof value === 'string') {
        return `<strong>${formattedField}:</strong> ${new Date(value).toLocaleString()}`;
      } else {
        return `<strong>${formattedField}:</strong> ${value}`;
      }
    })
    .filter(Boolean) // Remove null entries
    .join('<br/>');

  // Add metadata content if available
  if (metadata) {
    const limitParts: string[] = [];

    // Add SPC limits if available - display in a single line with pipe separators
    if (metadata.cl !== undefined && metadata.cl !== null) {
      limitParts.push(`<strong>CL:</strong> ${metadata.cl.toFixed(2)}`);
    }
    if (metadata.lcl !== undefined && metadata.lcl !== null) {
      limitParts.push(`<strong>LCL:</strong> ${metadata.lcl.toFixed(2)}`);
    }
    if (metadata.ucl !== undefined && metadata.ucl !== null) {
      limitParts.push(`<strong>UCL:</strong> ${metadata.ucl.toFixed(2)}`);
    }

    if (limitParts.length > 0) {
      const limitsLine = limitParts.join(' | ');
      return dataContent + '<br/><br/>' + limitsLine;
    }
  }

  return dataContent;
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Cd', 'CD')
    .replace('Att', 'ATT')
    .replace('Sig', 'Sig')
    .replace('X Y', 'X-Y')
  // .replace('Date Process', 'Date/Time')
  // .replace('Fake Property', 'Property');
}