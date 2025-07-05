'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BoxPlotData } from './hooks/useBoxPlotStatistics';
import { HoverData } from './hooks/useBoxPlotInteractions';

interface DataPoint {
  [key: string]: any;
}

interface BoxPlotRendererProps {
  /** Raw data points for rendering individual points */
  data: DataPoint[];
  /** Computed box plot statistics for each category */
  boxPlotData: BoxPlotData[];
  /** Column name for categorical grouping */
  categoricalColumn: string;
  /** Column name for numeric values */
  valueColumn: string;
  /** X-axis scale for positioning */
  xScale: d3.ScaleBand<string>;
  /** Y-axis scale for positioning */
  yScale: d3.ScaleLinear<number, number>;
  /** Chart height for bounds checking */
  chartHeight: number;
  /** Set hover data for box plot elements */
  onBoxHover: (data: Omit<Extract<HoverData, { type: 'box' }>, 'type'>, event: MouseEvent) => void;
  /** Set hover data for individual data points */
  onPointHover: (data: Omit<Extract<HoverData, { type: 'point' }>, 'type'>, event: MouseEvent) => void;
  /** Set hover data for mean markers */
  onMeanHover: (data: Omit<Extract<HoverData, { type: 'mean' }>, 'type'>, event: MouseEvent) => void;
  /** Clear all hover state */
  onHoverClear: () => void;
}

/**
 * Component responsible for rendering D3-based box plot elements
 * Handles boxes, whiskers, data points, outliers, and mean markers
 */
export const BoxPlotRenderer: React.FC<BoxPlotRendererProps> = ({
  data,
  boxPlotData,
  categoricalColumn,
  valueColumn,
  xScale,
  yScale,
  chartHeight,
  onBoxHover,
  onPointHover,
  onMeanHover,
  onHoverClear,
}) => {
  const rendererRef = useRef<SVGGElement>(null);

  // Seeded random function for consistent jitter
  const seedRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  useEffect(() => {
    const g = d3.select(rendererRef.current);
    if (!g.node() || boxPlotData.length === 0) return;

    // Clear previous elements
    g.selectAll('.box-plot').remove();
    g.selectAll('.data-point').remove();

    // Create box plots
    const boxWidth = xScale.bandwidth() * 0.6;
    const boxOffset = (xScale.bandwidth() - boxWidth) / 2;

    boxPlotData.forEach(boxData => {
      const x = xScale(boxData.entity);
      if (x == null) return;

      const boxGroup = g.append('g')
        .attr('class', 'box-plot')
        .attr('data-entity', boxData.entity);

      // Skip box plot for single point
      if (boxData.values.length > 1) {
        // Draw whiskers
        boxGroup.append('line')
          .attr('class', 'whisker whisker-lower')
          .attr('x1', x + xScale.bandwidth() / 2)
          .attr('x2', x + xScale.bandwidth() / 2)
          .attr('y1', yScale(boxData.q1))
          .attr('y2', yScale(boxData.minNonOutlier))
          .attr('stroke', '#000')
          .attr('stroke-width', 1);

        boxGroup.append('line')
          .attr('class', 'whisker whisker-upper')
          .attr('x1', x + xScale.bandwidth() / 2)
          .attr('x2', x + xScale.bandwidth() / 2)
          .attr('y1', yScale(boxData.maxNonOutlier))
          .attr('y2', yScale(boxData.q3))
          .attr('stroke', '#000')
          .attr('stroke-width', 1);

        // Draw whisker caps
        boxGroup.append('line')
          .attr('x1', x + xScale.bandwidth() / 2 - 10)
          .attr('x2', x + xScale.bandwidth() / 2 + 10)
          .attr('y1', yScale(boxData.minNonOutlier))
          .attr('y2', yScale(boxData.minNonOutlier))
          .attr('stroke', '#000')
          .attr('stroke-width', 1);

        boxGroup.append('line')
          .attr('x1', x + xScale.bandwidth() / 2 - 10)
          .attr('x2', x + xScale.bandwidth() / 2 + 10)
          .attr('y1', yScale(boxData.maxNonOutlier))
          .attr('y2', yScale(boxData.maxNonOutlier))
          .attr('stroke', '#000')
          .attr('stroke-width', 1);

        // Draw box
        const box = boxGroup.append('rect')
          .attr('class', 'box')
          .attr('x', x + boxOffset)
          .attr('y', yScale(boxData.q3))
          .attr('width', boxWidth)
          .attr('height', Math.max(0, yScale(boxData.q1) - yScale(boxData.q3)))
          .attr('fill', '#f0f0f0')
          .attr('stroke', '#000')
          .attr('stroke-width', 1)
          .attr('data-q1', boxData.q1)
          .attr('data-q3', boxData.q3);

        // Draw median line
        boxGroup.append('line')
          .attr('class', 'median-line')
          .attr('x1', x + boxOffset)
          .attr('x2', x + boxOffset + boxWidth)
          .attr('y1', yScale(boxData.median))
          .attr('y2', yScale(boxData.median))
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
          .attr('data-median', boxData.median);

        // Box hover handler
        box.on('mouseenter', (event) => {
          box.style('opacity', 0.8);
          onBoxHover({
            entity: boxData.entity,
            count: boxData.values.length,
            mean: boxData.mean,
            median: boxData.median,
            q1: boxData.q1,
            q3: boxData.q3,
            min: boxData.minNonOutlier,
            max: boxData.maxNonOutlier,
          }, event);
        })
        .on('mouseleave', () => {
          box.style('opacity', 1);
          onHoverClear();
        });
      }

      // Draw all data points with jitter
      const jitterWidth = boxWidth * 0.8;

      data
        .filter(d => d[categoricalColumn] === boxData.entity)
        .forEach((d, i) => {
          const value = d[valueColumn];
          if (value == null || isNaN(value)) return;

          const isOutlier = value < boxData.lowerWhisker || value > boxData.upperWhisker;
          const jitter = (seedRandom(i + boxData.entity.charCodeAt(0)) - 0.5) * jitterWidth;

          const point = g.append('circle')
            .attr('class', `data-point ${isOutlier ? 'outlier' : ''}`)
            .attr('cx', x + xScale.bandwidth() / 2 + jitter)
            .attr('cy', yScale(value))
            .attr('r', 3)
            .attr('fill', isOutlier ? '#ff4545' : 'rgba(128, 128, 128, 0.6)')
            .attr('data-value', value)
            .style('cursor', 'pointer');

          point.on('mouseenter', (event) => {
            point.attr('r', 4);
            onPointHover({
              entity: boxData.entity,
              value: value,
              isOutlier,
              ...d,
            }, event);
          })
          .on('mouseleave', () => {
            point.attr('r', 3);
            onHoverClear();
          });
        });

      // Draw mean marker (asterisk)
      const meanY = yScale(boxData.mean);
      if (!isNaN(meanY) && meanY >= 0 && meanY <= chartHeight) {
        const meanMarker = boxGroup.append('text')
          .attr('class', 'mean-marker')
          .attr('x', x + xScale.bandwidth() / 2)
          .attr('y', meanY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-size', '20px')
          .attr('font-weight', 'bold')
          .attr('fill', '#000')
          .attr('data-mean', boxData.mean)
          .text('*')
          .style('cursor', 'pointer');

        meanMarker.on('mouseenter', (event) => {
          onMeanHover({
            entity: boxData.entity,
            mean: boxData.mean,
          }, event);
        })
        .on('mouseleave', () => {
          onHoverClear();
        });
      }
    });
  }, [data, boxPlotData, categoricalColumn, valueColumn, xScale, yScale, chartHeight, onBoxHover, onPointHover, onMeanHover, onHoverClear]);

  return <g ref={rendererRef} className="box-plot-renderer" />;
};