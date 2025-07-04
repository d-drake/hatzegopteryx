'use client';

import React, { useEffect, useRef, useMemo, useState, useId } from 'react';
import * as d3 from 'd3';
import Axis from './Axis';
import ChartContainer from './ChartContainer';
import ZoomControls from './ZoomControls';
import { SpcCDUnits } from '@/lib/spc-dashboard/units_cd';

interface DataPoint {
  [key: string]: any;
}

interface BoxPlotData {
  entity: string;
  values: number[];
  q1: number;
  median: number;
  q3: number;
  mean: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
  minNonOutlier: number;
  maxNonOutlier: number;
}

interface VariabilityChartProps {
  data: DataPoint[];
  categoricalColumn: string;
  valueColumn: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yScale?: d3.ScaleLinear<number, number>; // Deprecated
  onYScaleChange?: (scale: d3.ScaleLinear<number, number>) => void; // Deprecated
  yZoomDomain?: [number, number] | null; // Zoom domain from parent
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for zoom changes
  onResetZoom?: () => void; // Callback for reset zoom
  isSideBySide?: boolean; // Whether chart is in side-by-side layout
  renderOverlays?: (scales: { xScale: d3.ScaleBand<string>; yScale: d3.ScaleLinear<number, number> }) => React.ReactNode;
}

// Simple tooltip component
const Tooltip: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => {
  return (
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        left: x + 10,
        top: y - 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

export const VariabilityChart: React.FC<VariabilityChartProps> = ({
  data,
  categoricalColumn,
  valueColumn,
  width,
  height,
  margin = { top: 20, right: 50, bottom: 80, left: 80 },
  yScale: externalYScale,
  onYScaleChange,
  yZoomDomain,
  onYZoomChange,
  onResetZoom,
  isSideBySide = false,
  renderOverlays,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [yDomain, setYDomain] = useState<[number, number] | null>(yZoomDomain || null);
  
  // Track if SVG width is narrow (< 800px)
  const isNarrowSVG = width < 800;
  
  // Adjust margins for narrow SVGs
  const responsiveMargin = useMemo(() => 
    isNarrowSVG
      ? { top: 40, right: 10, bottom: 80, left: 50 }
      : margin,
    [isNarrowSVG, margin]
  );

  const chartWidth = width - responsiveMargin.left - responsiveMargin.right;
  const chartHeight = height - responsiveMargin.top - responsiveMargin.bottom;

  // Calculate box plot statistics for each category
  const boxPlotData = useMemo(() => {
    const grouped = d3.group(data, d => d[categoricalColumn]);
    const boxPlots: BoxPlotData[] = [];

    grouped.forEach((values, category) => {
      const numericValues = values
        .map(d => d[valueColumn])
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b);

      if (numericValues.length === 0) return;

      const q1 = d3.quantile(numericValues, 0.25) || 0;
      const median = d3.quantile(numericValues, 0.5) || 0;
      const q3 = d3.quantile(numericValues, 0.75) || 0;
      const iqr = q3 - q1;
      const mean = d3.mean(numericValues) || 0;

      const lowerWhisker = q1 - 1.5 * iqr;
      const upperWhisker = q3 + 1.5 * iqr;

      const outliers = numericValues.filter(v => v < lowerWhisker || v > upperWhisker);
      const nonOutliers = numericValues.filter(v => v >= lowerWhisker && v <= upperWhisker);

      boxPlots.push({
        entity: String(category),
        values: numericValues,
        q1,
        median,
        q3,
        mean,
        iqr,
        lowerWhisker,
        upperWhisker,
        outliers,
        minNonOutlier: nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1,
        maxNonOutlier: nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3,
      });
    });

    return boxPlots.sort((a, b) => a.entity.localeCompare(b.entity));
  }, [data, categoricalColumn, valueColumn]);

  // Create scales
  const xScale = useMemo(() => {
    return d3.scaleBand()
      .domain(boxPlotData.map(d => d.entity))
      .range([0, chartWidth])
      .padding(0.2);
  }, [boxPlotData, chartWidth]);

  // Get original Y extent
  const originalYExtent = useMemo(() => {
    const allValues = boxPlotData.flatMap(d => d.values);
    if (allValues.length === 0) {
      return [0, 1] as [number, number];
    }
    return d3.extent(allValues) as [number, number];
  }, [boxPlotData]);

  // Use zoomed domain if available, otherwise use external scale domain if provided, otherwise use original extent
  const currentYExtent = yDomain || (externalYScale ? externalYScale.domain() as [number, number] : originalYExtent);

  const yScale = useMemo(() => {
    // Always create a scale with the current extent (which includes zoom)
    const scale = d3.scaleLinear()
      .domain(currentYExtent)
      .range([chartHeight, 0])
      .nice();
    return scale;
  }, [currentYExtent, chartHeight]);

  // Notify parent of initial scale creation (deprecated - for backward compatibility)
  useEffect(() => {
    if (!externalYScale && onYScaleChange && yScale) {
      onYScaleChange(yScale);
    }
  }, [yScale, externalYScale, onYScaleChange]);

  // Update local yDomain when prop changes
  useEffect(() => {
    setYDomain(yZoomDomain || null);
  }, [yZoomDomain]);

  // Handle Y-axis zoom with event listener
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      

      // Check if mouse is over y-axis area (to the left of the chart, in the margin area)
      const isOverYAxis = mouseX >= 0 && mouseX <= responsiveMargin.left &&
        mouseY >= responsiveMargin.top && mouseY <= responsiveMargin.top + chartHeight;

      if (isOverYAxis) {
        event.preventDefault();
        event.stopPropagation();

        const zoomFactor = 1.2;
        const zoomIn = event.deltaY < 0;
        const scale = zoomIn ? zoomFactor : 1 / zoomFactor;

        // Zoom Y-axis by updating the domain state
        const [min, max] = currentYExtent;
        const range = max - min;
        const center = min + range * 0.5;
        const newRange = range / scale;

        const newDomain: [number, number] = [center - newRange * 0.5, center + newRange * 0.5];
        setYDomain(newDomain);
        
        // Notify parent component of domain change
        if (onYZoomChange) {
          onYZoomChange(newDomain);
        }
        
        // Notify parent component of scale change (deprecated - for backward compatibility)
        if (onYScaleChange) {
          const newScale = d3.scaleLinear()
            .domain(newDomain)
            .range([chartHeight, 0])
            .nice();
          onYScaleChange(newScale);
        }
      }
    };

    // Add non-passive event listener directly to the SVG element
    svg.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [currentYExtent, chartHeight, responsiveMargin, onYScaleChange, onYZoomChange]);

  // Render D3 elements
  useEffect(() => {
    if (!svgRef.current || boxPlotData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('.chart-area');

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
          setHoveredData({
            type: 'box',
            entity: boxData.entity,
            count: boxData.values.length,
            mean: boxData.mean,
            median: boxData.median,
            q1: boxData.q1,
            q3: boxData.q3,
            min: boxData.minNonOutlier,
            max: boxData.maxNonOutlier,
          });
          const rect = (event.target as Element).getBoundingClientRect();
          setMousePosition({ x: rect.left + rect.width / 2, y: rect.top });
        })
        .on('mouseleave', () => {
          box.style('opacity', 1);
          setHoveredData(null);
        });
      }

      // Draw all data points with jitter
      const jitterWidth = boxWidth * 0.8;
      const seedRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

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
            setHoveredData({
              type: 'point',
              entity: boxData.entity,
              value: value,
              isOutlier,
              ...d,
            });
            const circle = event.target as Element;
            const rect = circle.getBoundingClientRect();
            setMousePosition({ x: rect.left + rect.width / 2, y: rect.top });
          })
          .on('mouseleave', () => {
            point.attr('r', 3);
            setHoveredData(null);
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
          setHoveredData({
            type: 'mean',
            entity: boxData.entity,
            mean: boxData.mean,
          });
          const rect = (event.target as Element).getBoundingClientRect();
          setMousePosition({ x: rect.left + rect.width / 2, y: rect.top });
        })
        .on('mouseleave', () => {
          setHoveredData(null);
        });
      }
    });
  }, [data, boxPlotData, categoricalColumn, valueColumn, xScale, yScale, chartHeight]);

  const chartId = useId();

  // Calculate zoom level
  const yZoomLevel = yDomain ? (originalYExtent[1] - originalYExtent[0]) / (yDomain[1] - yDomain[0]) : 1;

  // Reset zoom function
  const handleResetZoom = () => {
    if (onResetZoom) {
      onResetZoom();
    } else {
      // Local reset
      setYDomain(null);
      if (onYZoomChange) {
        onYZoomChange(null);
      }
    }
  };

  return (
    <div className="variability-chart-container" data-chart-id={chartId} style={{ position: 'relative' }}>
      {/* Zoom controls */}
      <ZoomControls
        yZoomLevel={yZoomLevel}
        onResetZoom={handleResetZoom}
      />
      
      <ChartContainer 
        ref={svgRef} 
        width={width} 
        height={height} 
        margin={responsiveMargin}
      >
        <defs>
          <clipPath id="variability-clip">
            <rect x={0} y={0} width={chartWidth} height={chartHeight} />
          </clipPath>
        </defs>
          <g className="chart-area data-area" clipPath="url(#variability-clip)" />
          {/* Render overlays (e.g., SPC limit lines) */}
          {renderOverlays && (
            <g className="chart-overlays" clipPath="url(#variability-clip)">
              {renderOverlays({ xScale, yScale })}
            </g>
          )}
          <Axis
            scale={yScale}
            orientation="left"
            transform={`translate(0,0)`}
            label={formatFieldName(valueColumn)}
            labelOffset={{ x: -chartHeight / 2, y: -50 }}
            responsive={isNarrowSVG}
            screenWidth={width}
          />
          <Axis
            scale={xScale}
            orientation="bottom"
            transform={`translate(0,${chartHeight})`}
            label={formatFieldName(categoricalColumn)}
            labelOffset={{ x: chartWidth / 2, y: isNarrowSVG ? 45 : 45 }}
            checkOverlap={true}
            responsive={isNarrowSVG}
            screenWidth={width}
          />
          
          {/* Y-axis zoom area */}
          <rect
            x={-responsiveMargin.left}
            y={0}
            width={responsiveMargin.left}
            height={chartHeight}
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
          />
      </ChartContainer>
      {hoveredData && mousePosition && (
        <Tooltip x={mousePosition.x} y={mousePosition.y}>
          {hoveredData.type === 'box' && (
            <>
              <div>Entity: {hoveredData.entity}</div>
              <div>Count: {hoveredData.count}</div>
              <div>Mean: {hoveredData.mean.toFixed(3)}</div>
              <div>Median: {hoveredData.median.toFixed(3)}</div>
              <div>Q1: {hoveredData.q1.toFixed(3)}</div>
              <div>Q3: {hoveredData.q3.toFixed(3)}</div>
              <div>Min: {hoveredData.min.toFixed(3)}</div>
              <div>Max: {hoveredData.max.toFixed(3)}</div>
            </>
          )}
          {hoveredData.type === 'point' && (
            <>
              <div>Entity: {hoveredData.entity}</div>
              <div>Value: {hoveredData.value.toFixed(3)}</div>
              {hoveredData.isOutlier && <div style={{ color: '#ff4545' }}>Outlier</div>}
              {hoveredData.lot && <div>Lot: {hoveredData.lot}</div>}
              {hoveredData.date_process && <div>Date: {new Date(hoveredData.date_process).toLocaleDateString()}</div>}
            </>
          )}
          {hoveredData.type === 'mean' && (
            <>
              <div>Entity: {hoveredData.entity}</div>
              <div>Mean: {hoveredData.mean.toFixed(3)}</div>
            </>
          )}
        </Tooltip>
      )}
    </div>
  );
};

// Format field names for axis labels (matching Timeline implementation)
function formatFieldName(field: string): string {
  if (Object.keys(SpcCDUnits).includes(field as keyof typeof SpcCDUnits)) {
    field = field + ` (${SpcCDUnits[field as keyof typeof SpcCDUnits]})`
  }

  field = field.replace(/_/g, ' ')
  if (field.includes("x_y")) {
    field = field.replace("x_y", "x-y")
  }
  // abbreviate long field names rendered on the Timeline
  if (field.length > 15) {
    field = field
      .split(' ')
      .map((word: string) => {
        if (word.length <= 4) {
          return word;
        }
        else {
          return word.slice(0, 4) + '.';
        }
      })
      .join(' ');

  }
  return field
}