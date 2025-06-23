'use client';

import { useMemo, useRef, useEffect, useState, useId } from 'react';
import ChartContainer, { useChartDimensions } from './ChartContainer';
import Axis from './Axis';
import Circles from './Circles';
import Symbols from './Symbols';
import Line from './Line';
import Legend from './Legend';
import { useTooltip, formatTooltipContent } from './Tooltip';
import ZoomControls from './ZoomControls';
import {
  createLinearScale,
  createTimeScale,
  createColorScale,
  createShapeScale,
  getUniqueValues,
  getNumericExtent,
  getDateExtent,
} from '@/lib/charts/scales';
interface TimelineProps<T extends Record<string, any>> {
  data: T[];
  xField: keyof T;
  yField: keyof T;
  colorField?: keyof T;
  shapeField?: keyof T;
  lineGroupField?: keyof T;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function Timeline<T extends Record<string, any>>({
  data,
  xField,
  yField,
  colorField = 'entity',
  shapeField,
  lineGroupField,
  width = 800,
  height = 500,
  margin = { top: 20, right: 150, bottom: 60, left: 70 },
}: TimelineProps<T>) {
  const { innerWidth, innerHeight } = useChartDimensions(width, height, margin);
  const { showTooltip, hideTooltip } = useTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<SVGGElement>(null);
  const clipPathId = useId();

  // Zoom state
  const [xDomain, setXDomain] = useState<[any, any] | null>(null);
  const [yDomain, setYDomain] = useState<[any, any] | null>(null);

  // Get original extents
  const originalXExtent = useMemo(() => {
    if (data.length > 0) {
      const firstValue = data[0][xField];
      if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
        return getDateExtent(data, xField);
      }
    }
    return getNumericExtent(data, xField);
  }, [data, xField]);

  const originalYExtent = useMemo(() => getNumericExtent(data, yField), [data, yField]);

  // Use zoomed domains if available, otherwise use original extents
  const currentXExtent = xDomain || originalXExtent;
  const currentYExtent = yDomain || originalYExtent;

  // Create scales - axes connect at origin, data maintains 30px margins
  const xScale = useMemo(() => {
    // Check if the first data point's xField value is a date
    if (data.length > 0) {
      const firstValue = data[0][xField];
      if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
        return createTimeScale(currentXExtent, [0, innerWidth]);
      }
    }
    return createLinearScale(currentXExtent, [0, innerWidth]);
  }, [data, xField, innerWidth, currentXExtent]);

  const yScale = useMemo(
    () => createLinearScale(currentYExtent, [innerHeight, 0]),
    [currentYExtent, innerHeight]
  );

  // Create data scales with margins for positioning data points
  const xDataScale = useMemo(() => {
    if (data.length > 0) {
      const firstValue = data[0][xField];
      if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
        return createTimeScale(currentXExtent, [30, innerWidth - 30]);
      }
    }
    return createLinearScale(currentXExtent, [30, innerWidth - 30]);
  }, [data, xField, innerWidth, currentXExtent]);

  const yDataScale = useMemo(
    () => createLinearScale(currentYExtent, [innerHeight - 30, 30]),
    [currentYExtent, innerHeight]
  );

  const colorCategories = useMemo(
    () => getUniqueValues(data, colorField),
    [data, colorField]
  );

  const colorScale = useMemo(
    () => createColorScale(colorCategories),
    [colorCategories]
  );

  const shapeCategories = useMemo(
    () => (shapeField ? getUniqueValues(data, shapeField) : []),
    [data, shapeField]
  );

  const shapeScale = useMemo(
    () => (shapeField ? createShapeScale(shapeCategories) : undefined),
    [shapeField, shapeCategories]
  );

  // Prepare legend items
  const colorLegendItems = useMemo(
    () => colorCategories.map(cat => ({ label: cat, color: colorScale(cat) })),
    [colorCategories, colorScale]
  );

  const shapeLegendItems = useMemo(
    () =>
      shapeField && shapeScale
        ? shapeCategories.map(cat => ({
          label: cat,
          shape: shapeScale(cat),
          color: 'gray',
        }))
        : [],
    [shapeField, shapeScale, shapeCategories]
  );

  // Accessor functions - use data scales for positioning data points
  const xAccessor = (d: T) => {
    const value = d[xField];
    if ((value as any) instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value as string)))) {
      return (xDataScale as any)(new Date(String(value)));
    } else {
      return (xDataScale as any)(Number(value));
    }
  };
  const yAccessor = (d: T) => yDataScale(Number(d[yField]));
  const colorAccessor = (d: T) => String(d[colorField]);
  const shapeAccessor = shapeField ? (d: T) => String(d[shapeField]) : undefined;
  const lineGroupAccessor = (d: T) => String(d[lineGroupField || colorField]);

  // Filter data to only show points within the visible chart area (respecting 30px margins)
  const visibleData = useMemo(() => {
    return data.filter(d => {
      const x = xAccessor(d);
      const y = yAccessor(d);

      // Check if point is within the clipped area (30px margins on all sides)
      const xInBounds = x >= 30 && x <= innerWidth - 30;
      const yInBounds = y >= 30 && y <= innerHeight - 30;

      return xInBounds && yInBounds;
    });
  }, [data, xAccessor, yAccessor, innerWidth, innerHeight]);

  // Handle hover
  const handleHover = (event: MouseEvent, datum: T | null) => {
    if (datum) {
      const tooltipFields = [xField, yField];
      if (colorField) tooltipFields.push(colorField);
      if (shapeField) tooltipFields.push(shapeField);

      const content = formatTooltipContent(datum as any, tooltipFields as string[]);
      showTooltip(content, event.pageX, event.pageY);
    } else {
      hideTooltip();
    }
  };

  // Set up wheel event listener with non-passive option
  useEffect(() => {
    const container = document.querySelector(`[data-chart-id="${clipPathId}"]`) as HTMLElement;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // X-axis zone should be from the X-axis line to the bottom of the SVG
      const xAxisLineY = margin.top + innerHeight;
      const xAxisZoneStart = xAxisLineY;  // Start exactly at the X-axis line
      const xAxisZoneEnd = height;        // End at the bottom of the entire SVG
      
      // Check if mouse is over x-axis area (from X-axis line to bottom of chart)
      const isOverXAxis = mouseY >= xAxisZoneStart && mouseY <= xAxisZoneEnd &&
        mouseX >= margin.left && mouseX <= margin.left + innerWidth;

      // Check if mouse is over y-axis area (to the left of the chart, in the margin area)
      const isOverYAxis = mouseX >= 0 && mouseX <= margin.left &&
        mouseY >= margin.top && mouseY <= margin.top + innerHeight;

      // Only prevent default and handle zoom if we're in a zoom area
      if (isOverXAxis || isOverYAxis) {
        event.preventDefault();
        event.stopPropagation();

        const zoomFactor = 1.2;
        const zoomIn = event.deltaY < 0;
        const scale = zoomIn ? zoomFactor : 1 / zoomFactor;

        if (isOverXAxis) {
          // Zoom X-axis by updating the domain state
          const [min, max] = currentXExtent;

          // Handle dates differently from numbers
          if (min instanceof Date && max instanceof Date) {
            const minTime = min.getTime();
            const maxTime = max.getTime();
            const range = maxTime - minTime;
            const center = minTime + range * 0.5;
            const newRange = range / scale;

            setXDomain([new Date(center - newRange * 0.5), new Date(center + newRange * 0.5)]);
          } else {
            // Handle numeric values
            const range = max - min;
            const center = min + range * 0.5;
            const newRange = range / scale;

            setXDomain([center - newRange * 0.5, center + newRange * 0.5]);
          }
        }

        if (isOverYAxis) {
          // Zoom Y-axis by updating the domain state
          const [min, max] = currentYExtent;
          const range = max - min;
          const center = min + range * 0.5;
          const newRange = range / scale;

          setYDomain([center - newRange * 0.5, center + newRange * 0.5]);
        }
      }
    };

    // Add non-passive event listener
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentXExtent, currentYExtent, innerWidth, innerHeight, margin, clipPathId, height]);

  // Reset zoom function
  const resetZoom = () => {
    setXDomain(null);
    setYDomain(null);
  };

  // Calculate zoom levels for display
  const getZoomLevel = (original: [any, any], current: [any, any]) => {
    const originalRange = original[1] - original[0];
    const currentRange = current[1] - current[0];
    return originalRange / currentRange;
  };

  const xZoomLevel = xDomain ? getZoomLevel(originalXExtent, xDomain) : 1;
  const yZoomLevel = yDomain ? getZoomLevel(originalYExtent, yDomain) : 1;

  return (
    <div
      style={{ position: 'relative' }}
      data-chart-id={clipPathId}
    >
      {/* Zoom controls */}
      <ZoomControls 
        xZoomLevel={xZoomLevel}
        yZoomLevel={yZoomLevel}
        onResetZoom={resetZoom}
      />

      <ChartContainer width={width} height={height} margin={margin} ref={svgRef}>
        <defs>
          <clipPath id={clipPathId}>
            <rect x={30} y={30} width={innerWidth - 60} height={innerHeight - 60} />
          </clipPath>
        </defs>
        <g ref={chartRef}>
          {/* Grid lines */}
          <Axis
            scale={xScale}
            orientation="bottom"
            transform={`translate(0,${innerHeight})`}
            gridLines
            gridLineLength={-innerHeight}
          />
          <Axis
            scale={yScale}
            orientation="left"
            gridLines
            gridLineLength={-innerWidth}
          />

          {/* Axes */}
          <Axis
            scale={xScale}
            orientation="bottom"
            transform={`translate(0,${innerHeight})`}
            label={formatFieldName(String(xField))}
            labelOffset={{ x: innerWidth / 2, y: 45 }}
          />
          <Axis
            scale={yScale}
            orientation="left"
            label={formatFieldName(String(yField))}
            labelOffset={{ x: -innerHeight / 2, y: -50 }}
          />

          {/* Data points - use Circles or Symbols based on shapeField */}
          <g clipPath={`url(#${clipPathId})`}>
            {shapeField && shapeScale ? (
              <Symbols
                data={visibleData}
                xAccessor={xAccessor}
                yAccessor={yAccessor}
                colorAccessor={colorAccessor}
                shapeAccessor={shapeAccessor}
                colorScale={colorScale}
                shapeScale={shapeScale}
                onHover={handleHover}
              />
            ) : (
              <Circles
                data={visibleData}
                xAccessor={xAccessor}
                yAccessor={yAccessor}
                colorAccessor={colorAccessor}
                colorScale={colorScale}
                onHover={handleHover}
              />
            )}

            {/* Connection lines by group field */}
            <Line
              data={visibleData}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
              groupBy={lineGroupAccessor}
              stroke="#666666"
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          </g>

          {/* Legends */}
          <Legend
            title={formatFieldName(String(colorField))}
            items={colorLegendItems}
            x={innerWidth + 20}
            y={20}
          />

          {shapeLegendItems.length > 0 && (
            <Legend
              title={formatFieldName(String(shapeField!))}
              items={shapeLegendItems}
              x={innerWidth + 20}
              y={40 + colorLegendItems.length * 20}
            />
          )}

          {/* Zoom areas for user guidance */}
          {/* X-axis zoom area - from X-axis line to bottom of chart */}
          <rect
            x={0}
            y={innerHeight}
            width={innerWidth}
            height={margin.bottom}
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
          />

          {/* Y-axis zoom area */}
          <rect
            x={-margin.left}
            y={0}
            width={margin.left}
            height={innerHeight}
            fill="transparent"
            style={{ cursor: 'ew-resize' }}
          />

        </g>
      </ChartContainer>
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}