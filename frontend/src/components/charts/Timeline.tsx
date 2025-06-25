'use client';

import { useMemo, useRef, useEffect, useState, useId, useCallback } from 'react';
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
import { SpcCDUnits } from '@/lib/spc-dashboard/units_cd';
interface TimelineProps<T extends Record<string, any>> {
  data: T[];
  xField: keyof T;
  yField: keyof T;
  y2Field?: keyof T; // Secondary Y-axis field
  colorField?: keyof T;
  shapeField?: keyof T;
  lineGroupField?: keyof T;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  renderOverlays?: (scales: {
    xScale: any;
    yScale: any;
    y2Scale?: any;
    clipPathId?: string;
  }) => React.ReactNode;
  tooltipMetadata?: Record<string, any>; // Additional metadata for tooltips
}


export default function Timeline<T extends Record<string, any>>({
  data,
  xField,
  yField,
  y2Field,
  colorField = 'entity',
  shapeField,
  lineGroupField,
  width = 800,
  height = 500,
  margin = { top: 60, right: 200, bottom: 60, left: 70 },
  renderOverlays,
  tooltipMetadata,
}: TimelineProps<T>) {
  const { innerWidth, innerHeight } = useChartDimensions(width, height, margin);
  const { showTooltip, hideTooltip } = useTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<SVGGElement>(null);
  const clipPathId = useId();

  // Zoom state
  const [xDomain, setXDomain] = useState<[any, any] | null>(null);
  const [yDomain, setYDomain] = useState<[any, any] | null>(null);
  const [y2Domain, setY2Domain] = useState<[any, any] | null>(null);

  // Legend selection state
  const [selectedColorItems, setSelectedColorItems] = useState<Set<string>>(new Set());
  const [selectedShapeItems, setSelectedShapeItems] = useState<Set<string>>(new Set());

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

  const originalY2Extent = useMemo(() =>
    y2Field ? getNumericExtent(data, y2Field) : [0, 1] as [number, number],
    [data, y2Field]
  );

  // Use zoomed domains if available, otherwise use original extents
  const currentXExtent = xDomain || originalXExtent;
  const currentYExtent = yDomain || originalYExtent;
  const currentY2Extent = y2Domain || originalY2Extent;

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

  // Secondary Y-axis scale (positioned on the right)
  const y2Scale = useMemo(
    () => y2Field ? createLinearScale(currentY2Extent, [innerHeight, 0]) : null,
    [y2Field, currentY2Extent, innerHeight]
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

  const y2DataScale = useMemo(
    () => y2Field ? createLinearScale(currentY2Extent, [innerHeight - 30, 30]) : null,
    [y2Field, currentY2Extent, innerHeight]
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
  const xAccessor = useCallback((d: T) => {
    const value = d[xField];
    if ((value as any) instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value as string)))) {
      return (xDataScale as any)(new Date(String(value)));
    } else {
      return (xDataScale as any)(Number(value));
    }
  }, [xField, xDataScale]);

  const yAccessor = useCallback((d: T) => yDataScale(Number(d[yField])), [yField, yDataScale]);

  const y2Accessor = useMemo(() => {
    return y2Field && y2DataScale ? (d: T) => y2DataScale(Number(d[y2Field])) : undefined;
  }, [y2Field, y2DataScale]);

  const colorAccessor = useCallback((d: T) => String(d[colorField]), [colorField]);
  const shapeAccessor = useMemo(() => {
    return shapeField ? (d: T) => String(d[shapeField]) : undefined;
  }, [shapeField]);
  const lineGroupAccessor = useCallback((d: T) => String(d[lineGroupField || colorField]), [lineGroupField, colorField]);

  // Filter data to only show points within the visible chart area (respecting 30px margins)
  const visibleData = useMemo(() => {
    return data.filter(d => {
      const x = xAccessor(d);
      const y = yAccessor(d);
      const y2 = y2Accessor ? y2Accessor(d) : null;

      // Check if point is within the clipped area (30px margins on all sides)
      const xInBounds = x >= 30 && x <= innerWidth - 30;
      const yInBounds = y >= 30 && y <= innerHeight - 30;
      const y2InBounds = y2 === null || (y2 >= 30 && y2 <= innerHeight - 30);

      // Point is visible if X is in bounds AND either Y or Y2 is in bounds
      return xInBounds && (yInBounds || y2InBounds);
    });
  }, [data, xAccessor, yAccessor, y2Accessor, innerWidth, innerHeight]);

  // Handle hover
  const handleHover = (event: MouseEvent, datum: T | null) => {
    if (datum) {
      const tooltipFields = [xField, yField];
      if (y2Field) tooltipFields.push(y2Field);
      if (colorField) tooltipFields.push(colorField);
      if (shapeField) tooltipFields.push(shapeField);

      const content = formatTooltipContent(datum as any, tooltipFields as string[], tooltipMetadata);
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

      // Check if mouse is over secondary y-axis area (to the right of the chart, when y2Field exists)
      const isOverY2Axis = y2Field && mouseX >= margin.left + innerWidth && mouseX <= margin.left + innerWidth + 75 &&
        mouseY >= margin.top && mouseY <= margin.top + innerHeight;

      // Only prevent default and handle zoom if we're in a zoom area
      if (isOverXAxis || isOverYAxis || isOverY2Axis) {
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

        if (isOverY2Axis) {
          // Zoom secondary Y-axis by updating the domain state
          const [min, max] = currentY2Extent;
          const range = max - min;
          const center = min + range * 0.5;
          const newRange = range / scale;

          setY2Domain([center - newRange * 0.5, center + newRange * 0.5]);
        }
      }
    };

    // Add non-passive event listener
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentXExtent, currentYExtent, currentY2Extent, innerWidth, innerHeight, margin, clipPathId, height, y2Field, width]);

  // Reset zoom function
  const resetZoom = () => {
    setXDomain(null);
    setYDomain(null);
    setY2Domain(null);
  };

  // Calculate zoom levels for display
  const getZoomLevel = (original: [any, any], current: [any, any]) => {
    const originalRange = original[1] - original[0];
    const currentRange = current[1] - current[0];
    return originalRange / currentRange;
  };

  const xZoomLevel = xDomain ? getZoomLevel(originalXExtent, xDomain) : 1;
  const yZoomLevel = yDomain ? getZoomLevel(originalYExtent, yDomain) : 1;
  const y2ZoomLevel = y2Domain ? getZoomLevel(originalY2Extent, y2Domain) : 1;

  // Handle legend item clicks
  const handleColorLegendClick = (label: string) => {
    setSelectedColorItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleShapeLegendClick = (label: string) => {
    setSelectedShapeItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  // Reset legend selections
  const resetLegendSelections = () => {
    setSelectedColorItems(new Set());
    setSelectedShapeItems(new Set());
  };

  // Check if any legend items are selected
  const hasSelections = selectedColorItems.size > 0 || selectedShapeItems.size > 0;

  return (
    <div
      style={{ position: 'relative' }}
      data-chart-id={clipPathId}
    >
      {/* Zoom controls */}
      <ZoomControls
        xZoomLevel={xZoomLevel}
        yZoomLevel={yZoomLevel}
        y2ZoomLevel={y2Field ? y2ZoomLevel : undefined}
        onResetZoom={resetZoom}
      />


      <ChartContainer width={width} height={height} margin={margin} ref={svgRef}>
        <defs>
          <clipPath id={clipPathId}>
            <rect x={30} y={30} width={innerWidth - 60} height={innerHeight - 60} />
          </clipPath>
        </defs>
        <g ref={chartRef}>
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

          {/* Secondary Y-axis (right side) */}
          {y2Field && y2Scale && (
            <Axis
              scale={y2Scale}
              orientation="right"
              transform={`translate(${innerWidth},0)`}
              label={formatFieldName(String(y2Field))}
              labelOffset={{ x: -innerHeight / 2, y: 60 }}
            />
          )}

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
                selectedColorItems={selectedColorItems}
                selectedShapeItems={selectedShapeItems}
              />
            ) : (
              <Circles
                data={visibleData}
                xAccessor={xAccessor}
                yAccessor={yAccessor}
                colorAccessor={colorAccessor}
                colorScale={colorScale}
                onHover={handleHover}
                selectedColorItems={selectedColorItems}
              />
            )}

            {/* Primary Y-axis connection lines by group field */}
            <Line
              data={visibleData}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
              groupBy={lineGroupAccessor}
              stroke="#000000"
              strokeWidth={2}
              strokeOpacity={0.3}
            />

            {/* Secondary Y-axis line for y2 data */}
            {y2Field && y2Accessor && (
              <Line
                data={visibleData}
                xAccessor={xAccessor}
                yAccessor={y2Accessor}
                groupBy={lineGroupAccessor}
                stroke="#cccccc"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
            )}
          </g>

          {/* Render overlay components (like SPC limit lines) outside clipped area */}
          {renderOverlays && renderOverlays({
            xScale,
            yScale,
            y2Scale,
            clipPathId
          })}

          {/* Reset button aligned with middle of ZoomControls */}
          {hasSelections && (
            <g
              transform={`translate(${innerWidth + (y2Field ? 85 : 20)}, -40)`}
              onClick={resetLegendSelections}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={0}
                y={0}
                width={100}
                height={20}
                rx={3}
                fill="#f9fafb"
                stroke="#6b7280"
                strokeWidth={1}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute('fill', '#f3f4f6');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.setAttribute('fill', '#f9fafb');
                }}
              />
              <text
                x={50}
                y={13}
                textAnchor="middle"
                fontSize={11}
                fill="#374151"
                fontWeight="500"
                style={{ pointerEvents: 'none' }}
              >
                Reset Selections
              </text>
            </g>
          )}

          {/* Legends - adjust position when secondary Y-axis is present */}
          <Legend
            title={formatFieldName(String(colorField))}
            items={colorLegendItems}
            x={innerWidth + (y2Field ? 85 : 20)}
            y={0}
            selectedItems={selectedColorItems}
            onItemClick={handleColorLegendClick}
            hasOtherSelections={selectedShapeItems.size > 0}
          />

          {shapeLegendItems.length > 0 && (
            <Legend
              title={formatFieldName(String(shapeField!))}
              items={shapeLegendItems}
              x={innerWidth + (y2Field ? 85 : 20)}
              y={20 + colorLegendItems.length * 20}
              selectedItems={selectedShapeItems}
              onItemClick={handleShapeLegendClick}
              hasOtherSelections={selectedColorItems.size > 0}
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
            style={{ cursor: 'ew-resize' }}
          />

          {/* Y-axis zoom area */}
          <rect
            x={-margin.left}
            y={0}
            width={margin.left}
            height={innerHeight}
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
          />

          {/* Secondary Y-axis zoom area (right side) */}
          {y2Field && (
            <rect
              x={innerWidth}
              y={0}
              width={75} // 50% of original margin.right (150px)
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'ns-resize' }}
            />
          )}

        </g>
      </ChartContainer>
    </div>
  );
}

function formatFieldName(field: string): string {
  // look up units from frontend lib
  console.log(Object.keys(SpcCDUnits))
  if (Object.keys(SpcCDUnits).includes(field as SpcCDUnits)) {
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