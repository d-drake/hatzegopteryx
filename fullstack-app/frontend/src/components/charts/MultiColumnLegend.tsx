'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface LegendItem {
  label: string;
  color?: string;
  shape?: d3.SymbolType;
}

interface MultiColumnLegendProps {
  title: string;
  items: LegendItem[];
  x?: number;
  y?: number;
  itemHeight?: number;
  symbolSize?: number;
  selectedItems?: Set<string>;
  onItemClick?: (label: string) => void;
  hasOtherSelections?: boolean;
  maxHeight?: number; // Maximum height before wrapping to new column
  columnGap?: number; // Gap between columns
  maxColumns?: number; // Maximum number of columns
}

export default function MultiColumnLegend({
  title,
  items,
  x = 0,
  y = 0,
  itemHeight = 20,
  symbolSize = 40,
  selectedItems,
  onItemClick,
  hasOtherSelections = false,
  maxHeight = 400,
  columnGap = 30,
  maxColumns = 3,
}: MultiColumnLegendProps) {
  const gRef = useRef<SVGGElement>(null);

  // Calculate column layout
  const columnLayout = useMemo(() => {
    const titleHeight = 15;
    const availableHeight = maxHeight - titleHeight;
    const itemsPerColumn = Math.floor(availableHeight / itemHeight);
    
    const columns: LegendItem[][] = [];
    let currentColumn: LegendItem[] = [];
    
    items.forEach((item, index) => {
      if (currentColumn.length >= itemsPerColumn && columns.length < maxColumns - 1) {
        columns.push(currentColumn);
        currentColumn = [];
      }
      currentColumn.push(item);
    });
    
    if (currentColumn.length > 0) {
      columns.push(currentColumn);
    }
    
    return columns;
  }, [items, maxHeight, itemHeight, maxColumns]);

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

    // Calculate the width needed for the longest text in each column
    const tempText = g.append('text')
      .style('font-size', '12px')
      .style('visibility', 'hidden');
    
    const columnWidths = columnLayout.map(column => {
      const maxWidth = Math.max(...column.map(item => {
        tempText.text(item.label);
        return tempText.node()?.getBBox().width || 0;
      }));
      return 15 + maxWidth + 12; // 15px for symbol area + text width + 12px right padding
    });
    
    tempText.remove();

    // Render each column
    columnLayout.forEach((columnItems, columnIndex) => {
      const columnX = columnIndex > 0 
        ? columnWidths.slice(0, columnIndex).reduce((sum, w) => sum + w + columnGap, 0)
        : 0;

      const columnG = g.append('g')
        .attr('class', `legend-column-${columnIndex}`)
        .attr('transform', `translate(${columnX}, 0)`);

      // Add items for this column
      const legendItems = columnG
        .selectAll('.legend-item')
        .data(columnItems)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${15 + i * itemHeight})`);

      // Add clickable background panels
      legendItems
        .append('rect')
        .attr('class', 'legend-panel')
        .attr('x', 0)
        .attr('y', -8)
        .attr('width', columnWidths[columnIndex])
        .attr('height', itemHeight - 4)
        .style('fill', 'transparent')
        .style('cursor', onItemClick ? 'pointer' : 'default')
        .on('mouseenter', function() {
          d3.select(this).style('fill', 'rgba(0, 0, 0, 0.05)');
        })
        .on('mouseleave', function() {
          d3.select(this).style('fill', 'transparent');
        })
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
        const shouldBeTransparent = hasSelections && !isSelected;
        const opacity = shouldBeTransparent ? 0.3 : 1;
        
        if (d.shape) {
          item
            .append('path')
            .attr('transform', 'translate(5, 0)')
            .attr('d', d3.symbol().type(d.shape).size(symbolSize)())
            .style('fill', d.color || 'gray')
            .style('opacity', opacity)
            .style('pointer-events', 'none');
        } else {
          item
            .append('circle')
            .attr('cx', 5)
            .attr('cy', 0)
            .attr('r', 4)
            .style('fill', d.color || 'gray')
            .style('opacity', opacity)
            .style('pointer-events', 'none');
        }

        item
          .append('text')
          .attr('x', 15)
          .attr('y', 4)
          .style('font-size', '12px')
          .style('opacity', opacity)
          .style('pointer-events', 'none')
          .text(d.label);
      });
    });
  }, [title, items, itemHeight, symbolSize, selectedItems, onItemClick, hasOtherSelections, columnLayout, columnGap]);

  return <g ref={gRef} transform={`translate(${x}, ${y})`} className="multi-column-legend" />;
}