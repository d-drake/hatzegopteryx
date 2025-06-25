'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LegendItem {
  label: string;
  color?: string;
  shape?: d3.SymbolType;
}

interface LegendProps {
  title: string;
  items: LegendItem[];
  x?: number;
  y?: number;
  itemHeight?: number;
  symbolSize?: number;
  selectedItems?: Set<string>;
  onItemClick?: (label: string) => void;
  hasOtherSelections?: boolean;
}

export default function Legend({
  title,
  items,
  x = 0,
  y = 0,
  itemHeight = 20,
  symbolSize = 40,
  selectedItems,
  onItemClick,
  hasOtherSelections = false,
}: LegendProps) {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);
    
    // Clear previous legend
    g.selectAll('*').remove();

    // Add title
    g.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(title);

    // Add items
    const legendItems = g
      .selectAll('.legend-item')
      .data(items)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${15 + i * itemHeight})`)
      .style('cursor', onItemClick ? 'pointer' : 'default')
      .on('click', function(event, d) {
        if (onItemClick) {
          onItemClick(d.label);
        }
      });

    // Add symbols or circles
    legendItems.each(function(d) {
      const item = d3.select(this);
      
      // Determine if this item should be transparent
      const hasSelections = selectedItems && selectedItems.size > 0;
      const isSelected = selectedItems && selectedItems.has(d.label);
      const shouldBeTransparent = (hasSelections && !isSelected) || hasOtherSelections;
      const opacity = shouldBeTransparent ? 0.3 : 1;
      
      if (d.shape) {
        item
          .append('path')
          .attr('transform', 'translate(5, 0)')
          .attr('d', d3.symbol().type(d.shape).size(symbolSize)())
          .style('fill', d.color || 'gray')
          .style('opacity', opacity);
      } else {
        item
          .append('circle')
          .attr('cx', 5)
          .attr('cy', 0)
          .attr('r', 4)
          .style('fill', d.color || 'gray')
          .style('opacity', opacity);
      }

      item
        .append('text')
        .attr('x', 15)
        .attr('y', 4)
        .style('font-size', '12px')
        .style('opacity', opacity)
        .text(d.label);
    });
  }, [title, items, itemHeight, symbolSize, selectedItems, onItemClick, hasOtherSelections]);

  return <g ref={gRef} transform={`translate(${x}, ${y})`} className="legend" />;
}