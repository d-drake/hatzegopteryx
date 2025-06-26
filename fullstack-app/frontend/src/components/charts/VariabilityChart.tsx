'use client';

import { useMemo, useRef, useEffect, useId, useCallback } from 'react';
import * as d3 from 'd3';
import ChartContainer, { useChartDimensions } from './ChartContainer';
import Axis from './Axis';
import { useTooltip } from './Tooltip';
import { createLinearScale, createColorScale, getNumericExtent } from '@/lib/charts/scales';
import { processDataForBoxPlots, formatBoxPlotTooltip, BoxPlotStats } from '@/lib/charts/boxPlotStats';

interface VariabilityChartProps<T extends Record<string, any>> {
  data: T[];
  yField: keyof T;
  groupField: keyof T; // 'entity' for SPC implementation
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yScale?: any; // Shared scale from adjacent Timeline
  outlierThreshold?: number; // IQR multiplier for outliers (default 1.5)
  onHover?: (event: MouseEvent, datum: T | null) => void;
}

interface BoxPlotDataPoint {
  entity: string;
  values: number[];
  stats: BoxPlotStats;
  count: number;
}

export default function VariabilityChart<T extends Record<string, any>>({
  data,
  yField,
  groupField,
  width = 400,
  height = 500,
  margin = { top: 20, right: 40, bottom: 60, left: 70 },
  yScale: providedYScale,
  outlierThreshold = 1.5,
  onHover,
}: VariabilityChartProps<T>) {
  // Chart rendering with data validation
  if (!data || data.length === 0) {
    console.warn('VariabilityChart component: No data provided for rendering');
  }

  // All hooks must be called at the top level
  const { innerWidth, innerHeight } = useChartDimensions(width, height, margin);
  const { showTooltip, hideTooltip } = useTooltip();
  const gRef = useRef<SVGGElement>(null);
  const clipPathId = useId();

  // Process data for box plots
  const { boxPlotData, entityNames, allValues } = useMemo(() => {
    if (!data || data.length === 0) {
      return { 
        boxPlotData: [], 
        entityNames: [], 
        allValues: [] 
      };
    }
    return processDataForBoxPlots(data, yField, groupField, outlierThreshold);
  }, [data, yField, groupField, outlierThreshold]);

  // Create scales
  const xScale = useMemo(() => {
    return d3.scaleBand()
      .domain(entityNames)
      .range([0, innerWidth])
      .padding(0.2);
  }, [entityNames, innerWidth]);

  const yExtent = useMemo(() => {
    if (!data || data.length === 0) return [0, 1] as [number, number];
    return getNumericExtent(data, yField);
  }, [data, yField]);

  const yScale = useMemo(() => {
    return providedYScale || createLinearScale(yExtent, [innerHeight, 0]);
  }, [providedYScale, yExtent, innerHeight]);

  // Color scale for outliers
  const colorScale = useMemo(() => {
    return createColorScale(['normal', 'outlier']);
  }, []);

  // Render box plots using D3
  useEffect(() => {
    if (!gRef.current || !data || data.length === 0) return;

    const g = d3.select(gRef.current);
    
    // Clear previous content
    g.selectAll('.box-plot-group').remove();

    if (boxPlotData.length === 0) return;

    // Create groups for each entity
    const boxGroups = g
      .selectAll('.box-plot-group')
      .data(boxPlotData)
      .enter()
      .append('g')
      .attr('class', 'box-plot-group')
      .attr('transform', d => `translate(${xScale(d.entity)! + xScale.bandwidth() / 2}, 0)`);

    const boxWidth = Math.min(xScale.bandwidth() * 0.6, 60);

    // Draw boxes (Q1 to Q3)
    boxGroups
      .append('rect')
      .attr('class', 'box')
      .attr('x', -boxWidth / 2)
      .attr('y', d => yScale(d.stats.q3))
      .attr('width', boxWidth)
      .attr('height', d => yScale(d.stats.q1) - yScale(d.stats.q3))
      .style('fill', '#e3f2fd')
      .style('stroke', '#1976d2')
      .style('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('fill', '#bbdefb');
        
        const tooltipContent = formatBoxPlotTooltip(d.stats, d.entity, d.count);
        showTooltip(tooltipContent, event.pageX, event.pageY);
        
        if (onHover) {
          // Pass the first data point for this entity as context
          const sampleDatum = data.find(item => String(item[groupField]) === d.entity);
          onHover(event, sampleDatum || null);
        }
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .style('fill', '#e3f2fd');
        
        hideTooltip();
        if (onHover) onHover(event, null);
      });

    // Draw median lines (bold horizontal line)
    boxGroups
      .append('line')
      .attr('class', 'median-line')
      .attr('x1', -boxWidth / 2)
      .attr('x2', boxWidth / 2)
      .attr('y1', d => yScale(d.stats.median))
      .attr('y2', d => yScale(d.stats.median))
      .style('stroke', '#0d47a1')
      .style('stroke-width', 3);

    // Draw whiskers (dashed lines from box to whisker ends)
    boxGroups
      .append('line')
      .attr('class', 'whisker-line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', d => yScale(d.stats.q3))
      .attr('y2', d => yScale(d.stats.whiskerMax))
      .style('stroke', '#424242')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '5,3');

    boxGroups
      .append('line')
      .attr('class', 'whisker-line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', d => yScale(d.stats.q1))
      .attr('y2', d => yScale(d.stats.whiskerMin))
      .style('stroke', '#424242')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '5,3');

    // Draw whisker caps (horizontal lines at whisker ends)
    const capWidth = boxWidth * 0.3;
    boxGroups
      .append('line')
      .attr('class', 'whisker-cap')
      .attr('x1', -capWidth / 2)
      .attr('x2', capWidth / 2)
      .attr('y1', d => yScale(d.stats.whiskerMax))
      .attr('y2', d => yScale(d.stats.whiskerMax))
      .style('stroke', '#424242')
      .style('stroke-width', 1.5);

    boxGroups
      .append('line')
      .attr('class', 'whisker-cap')
      .attr('x1', -capWidth / 2)
      .attr('x2', capWidth / 2)
      .attr('y1', d => yScale(d.stats.whiskerMin))
      .attr('y2', d => yScale(d.stats.whiskerMin))
      .style('stroke', '#424242')
      .style('stroke-width', 1.5);

    // Draw outlier points (red circles)
    boxGroups.each(function(d) {
      const group = d3.select(this);
      
      if (d.stats.outliers.length > 0) {
        // Add some horizontal jitter to prevent overlapping outliers
        const jitterScale = d3.scaleLinear()
          .domain([0, d.stats.outliers.length - 1])
          .range([-boxWidth * 0.3, boxWidth * 0.3]);

        group
          .selectAll('.outlier')
          .data(d.stats.outliers)
          .enter()
          .append('circle')
          .attr('class', 'outlier')
          .attr('cx', (_, i) => d.stats.outliers.length > 1 ? jitterScale(i) : 0)
          .attr('cy', outlier => yScale(outlier))
          .attr('r', 3)
          .style('fill', '#f44336')
          .style('stroke', '#d32f2f')
          .style('stroke-width', 1)
          .style('opacity', 0.8)
          .style('cursor', 'pointer')
          .on('mouseover', function(event, outlierValue) {
            d3.select(this)
              .attr('r', 4)
              .style('opacity', 1);
            
            const tooltipContent = `
              <strong>Entity:</strong> ${d.entity}<br/>
              <strong>Outlier Value:</strong> ${outlierValue.toFixed(2)}<br/>
              <strong>Type:</strong> ${outlierValue < d.stats.q1 ? 'Low Outlier' : 'High Outlier'}
            `;
            showTooltip(tooltipContent, event.pageX, event.pageY);
          })
          .on('mouseout', function(event) {
            d3.select(this)
              .attr('r', 3)
              .style('opacity', 0.8);
            hideTooltip();
          });
      }
    });

    // Draw mean diamonds (optional)
    boxGroups
      .append('path')
      .attr('class', 'mean-diamond')
      .attr('d', d => {
        const size = 6;
        const meanY = yScale(d.stats.mean || d.stats.median);
        return `M 0,${meanY - size} L ${size},${meanY} L 0,${meanY + size} L ${-size},${meanY} Z`;
      })
      .style('fill', '#ff9800')
      .style('stroke', '#f57c00')
      .style('stroke-width', 1)
      .style('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .style('opacity', 1);
        
        const tooltipContent = `
          <strong>Entity:</strong> ${d.entity}<br/>
          <strong>Mean:</strong> ${(d.stats.mean || 0).toFixed(2)}<br/>
          <strong>Std Dev:</strong> ${(d.stats.standardDeviation || 0).toFixed(2)}
        `;
        showTooltip(tooltipContent, event.pageX, event.pageY);
      })
      .on('mouseout', function(event) {
        d3.select(this)
          .style('opacity', 0.8);
        hideTooltip();
      });

  }, [boxPlotData, xScale, yScale, innerWidth, innerHeight, showTooltip, hideTooltip, onHover, data, groupField]);

  // Early return for empty data with basic chart structure
  if (!data || data.length === 0) {
    console.log(`📊 No data provided - rendering empty variability chart container`);
    return (
      <div style={{ position: 'relative' }}>
        <ChartContainer width={width} height={height} margin={margin}>
          <text 
            x={innerWidth / 2} 
            y={innerHeight / 2} 
            textAnchor="middle" 
            fill="#6b7280"
            fontSize="14"
          >
            No data available for box plot
          </text>
        </ChartContainer>
      </div>
    );
  }

  const formatFieldName = useCallback((field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <ChartContainer width={width} height={height} margin={margin}>
        <defs>
          <clipPath id={clipPathId}>
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
        
        <g ref={gRef} clipPath={`url(#${clipPathId})`} />
        
        {/* Custom X-Axis for Band Scale */}
        <g className="x-axis" transform={`translate(0,${innerHeight})`}>
          {entityNames.map((entity, i) => (
            <g key={entity} transform={`translate(${xScale(entity)! + xScale.bandwidth() / 2}, 0)`}>
              <line y1={0} y2={5} stroke="#64748b" />
              <text
                y={18}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                {entity}
              </text>
            </g>
          ))}
          <line x1={0} x2={innerWidth} y1={0} y2={0} stroke="#64748b" />
          <text 
            x={innerWidth / 2} 
            y={45} 
            textAnchor="middle" 
            fontSize="14" 
            fill="#000000"
          >
            {formatFieldName(String(groupField))}
          </text>
        </g>
        
        {/* Y-Axis */}
        <Axis
          scale={yScale}
          orientation="left"
          label={formatFieldName(String(yField))}
          labelOffset={{ x: -innerHeight / 2, y: -50 }}
        />

        {/* Legend for box plot elements */}
        <g transform={`translate(${innerWidth + 10}, 20)`}>
          <text x={0} y={0} fontSize="12" fontWeight="bold" fill="#374151">
            Legend
          </text>
          
          {/* Box */}
          <rect x={0} y={15} width={12} height={8} fill="#e3f2fd" stroke="#1976d2" strokeWidth="1"/>
          <text x={18} y={23} fontSize="10" fill="#374151">Q1-Q3 Box</text>
          
          {/* Median line */}
          <line x1={0} x2={12} y1={35} y2={35} stroke="#0d47a1" strokeWidth="2"/>
          <text x={18} y={39} fontSize="10" fill="#374151">Median</text>
          
          {/* Mean diamond */}
          <path d="M 6,45 L 12,50 L 6,55 L 0,50 Z" fill="#ff9800" stroke="#f57c00"/>
          <text x={18} y={54} fontSize="10" fill="#374151">Mean</text>
          
          {/* Outlier */}
          <circle cx={6} cy={65} r={3} fill="#f44336" stroke="#d32f2f"/>
          <text x={18} y={69} fontSize="10" fill="#374151">Outlier</text>
          
          {/* Whiskers */}
          <line x1={6} x2={6} y1={75} y2={85} stroke="#424242" strokeDasharray="3,2"/>
          <text x={18} y={84} fontSize="10" fill="#374151">Whiskers</text>
        </g>
      </ChartContainer>
    </div>
  );
}