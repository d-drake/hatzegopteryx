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
  yScale?: any; // Optional shared Y-axis scale
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
  isNarrowViewport?: boolean; // For responsive legend positioning
}


export default function Timeline<T extends Record<string, any>>({
  data,
  xField,
  yField,
  y2Field,
  colorField = 'entity',
  shapeField,
  lineGroupField,
  yScale: providedYScale,
  width = 800,
  height = 500,
  margin = { top: 60, right: 200, bottom: 60, left: 70 },
  renderOverlays,
  tooltipMetadata,
  isNarrowViewport = false,
}: TimelineProps<T>) {
  // Chart rendering with data validation
  if (!data || data.length === 0) {
    console.warn('Timeline component: No data provided for rendering');
  }
  
  // All hooks must be called at the top level
  const { innerWidth, innerHeight } = useChartDimensions(width, height, margin);
  const { showTooltip, hideTooltip } = useTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<SVGGElement>(null);
  const clipPathId = useId();
  const chartId = useId();

  // Zoom state
  const [xDomain, setXDomain] = useState<[any, any] | null>(null);
  const [yDomain, setYDomain] = useState<[any, any] | null>(null);
  const [y2Domain, setY2Domain] = useState<[any, any] | null>(null);

  // Zoom limits
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 50.0;

  // Legend selection state
  const [selectedColorItems, setSelectedColorItems] = useState<Set<string>>(new Set());
  const [selectedShapeItems, setSelectedShapeItems] = useState<Set<string>>(new Set());

  // Get original extents
  const originalXExtent = useMemo(() => {
    if (!data || data.length === 0) return [0, 1]; // Default extent for empty data
    const firstValue = data[0][xField];
    if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
      return getDateExtent(data, xField);
    }
    return getNumericExtent(data, xField);
  }, [data, xField]);

  const originalYExtent = useMemo(() => {
    if (!data || data.length === 0) return [0, 1]; // Default extent for empty data
    return getNumericExtent(data, yField);
  }, [data, yField]);

  const originalY2Extent = useMemo(() => {
    if (!data || data.length === 0) return [0, 1] as [number, number]; // Default extent for empty data
    return y2Field ? getNumericExtent(data, y2Field) : [0, 1] as [number, number];
  }, [data, y2Field]);

  // Use zoomed domains if available, otherwise use original extents
  const currentXExtent = xDomain || originalXExtent;
  const currentYExtent = yDomain || originalYExtent;
  const currentY2Extent = y2Domain || originalY2Extent;

  // Create scales - axes connect at origin, data maintains 30px margins
  const xScale = useMemo(() => {
    // Check if the first data point's xField value is a date
    if (!data || data.length === 0) return createLinearScale([0, 1], [0, innerWidth]);
    const firstValue = data[0][xField];
    if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
      // Ensure we have date extents for time scale
      const [min, max] = currentXExtent;
      const dateExtent: [Date, Date] = [
        min instanceof Date ? min : new Date(min),
        max instanceof Date ? max : new Date(max)
      ];
      return createTimeScale(dateExtent, [0, innerWidth]);
    }
    return createLinearScale(currentXExtent as [number, number], [0, innerWidth]);
  }, [data, xField, innerWidth, currentXExtent]);

  const yScale = useMemo(() => {
    if (providedYScale) {
      return providedYScale;
    }
    return createLinearScale(currentYExtent as [number, number], [innerHeight, 0]);
  }, [providedYScale, currentYExtent, innerHeight]);

  // Secondary Y-axis scale (positioned on the right)
  const y2Scale = useMemo(
    () => y2Field ? createLinearScale(currentY2Extent as [number, number], [innerHeight, 0]) : null,
    [y2Field, currentY2Extent, innerHeight]
  );

  // Create data scales with margins for positioning data points
  const xDataScale = useMemo(() => {
    if (!data || data.length === 0) return createLinearScale([0, 1], [30, innerWidth - 30]);
    const firstValue = data[0][xField];
    if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
      // Ensure we have date extents for time scale
      const [min, max] = currentXExtent;
      const dateExtent: [Date, Date] = [
        min instanceof Date ? min : new Date(min),
        max instanceof Date ? max : new Date(max)
      ];
      return createTimeScale(dateExtent, [30, innerWidth - 30]);
    }
    return createLinearScale(currentXExtent as [number, number], [30, innerWidth - 30]);
  }, [data, xField, innerWidth, currentXExtent]);

  const yDataScale = useMemo(
    () => createLinearScale(currentYExtent as [number, number], [innerHeight, 0]),
    [currentYExtent, innerHeight]
  );

  const y2DataScale = useMemo(
    () => y2Field ? createLinearScale(currentY2Extent as [number, number], [innerHeight, 0]) : null,
    [y2Field, currentY2Extent, innerHeight]
  );

  const colorCategories = useMemo(
    () => (!data || data.length === 0) ? [] : getUniqueValues(data, colorField),
    [data, colorField]
  );

  const colorScale = useMemo(
    () => createColorScale(colorCategories),
    [colorCategories]
  );

  const shapeCategories = useMemo(
    () => (shapeField && data && data.length > 0 ? getUniqueValues(data, shapeField) : []),
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
    if (!data || data.length === 0) return 0;
    const value = d[xField];
    if ((value as any) instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value as string)))) {
      return (xDataScale as any)(new Date(String(value)));
    } else {
      return (xDataScale as any)(Number(value));
    }
  }, [xField, xDataScale, data]);

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
    if (!data || data.length === 0) return [];
    return data.filter(d => {
      const x = xAccessor(d);
      const y = yAccessor(d);
      const y2 = y2Accessor ? y2Accessor(d) : null;

      // Check if point is within the clipped area (30px margins on left/right, full height)
      const xInBounds = x >= 30 && x <= innerWidth - 30;
      const yInBounds = y >= 0 && y <= innerHeight;
      const y2InBounds = y2 === null || (y2 >= 0 && y2 <= innerHeight);

      // Point is visible if X is in bounds AND either Y or Y2 is in bounds
      return xInBounds && (yInBounds || y2InBounds);
    });
  }, [data, xAccessor, yAccessor, y2Accessor, innerWidth, innerHeight]);

  // Set up wheel event listener with non-passive option
  useEffect(() => {
    if (!data || data.length === 0) return; // Skip if no data
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
      // Calculate legend position and extend Y2 region accordingly
      const legendStartX = innerWidth + margin.left + 85;
      const isOverY2Axis = y2Field && 
        mouseX >= margin.left + innerWidth && mouseX <= legendStartX &&
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
          let newDomain: [any, any];

          // Handle dates differently from numbers
          if (min instanceof Date && max instanceof Date) {
            const minTime = min.getTime();
            const maxTime = max.getTime();
            const range = maxTime - minTime;
            const center = minTime + range * 0.5;
            const newRange = range / scale;

            newDomain = [new Date(center - newRange * 0.5), new Date(center + newRange * 0.5)];
          } else {
            // Handle numeric values
            const range = max - min;
            const center = min + range * 0.5;
            const newRange = range / scale;

            newDomain = [center - newRange * 0.5, center + newRange * 0.5];
          }

          // Apply zoom limits
          const limitedDomain = applyZoomLimits(newDomain, originalXExtent as [any, any]);
          if (limitedDomain) {
            setXDomain(limitedDomain);
          }
        }

        if (isOverYAxis) {
          // Zoom Y-axis by updating the domain state
          const [min, max] = currentYExtent;
          const range = max - min;
          const center = min + range * 0.5;
          const newRange = range / scale;

          const newDomain: [number, number] = [center - newRange * 0.5, center + newRange * 0.5];
          
          // Apply zoom limits
          const limitedDomain = applyZoomLimits(newDomain, originalYExtent as [any, any]);
          if (limitedDomain) {
            setYDomain(limitedDomain);
          }
        }

        if (isOverY2Axis) {
          // Zoom secondary Y-axis by updating the domain state
          const [min, max] = currentY2Extent;
          const range = max - min;
          const center = min + range * 0.5;
          const newRange = range / scale;

          const newDomain: [number, number] = [center - newRange * 0.5, center + newRange * 0.5];
          
          // Apply zoom limits
          const limitedDomain = applyZoomLimits(newDomain, originalY2Extent);
          if (limitedDomain) {
            setY2Domain(limitedDomain);
          }
        }
      }
    };

    // Add mouse move event listener for dynamic cursor feedback
    const handleMouseMove = (event: MouseEvent) => {
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

      // Calculate legend position and extend Y2 region accordingly
      const legendStartX = innerWidth + margin.left + 85;
      const isOverY2Axis = y2Field && 
        mouseX >= margin.left + innerWidth && mouseX <= legendStartX &&
        mouseY >= margin.top && mouseY <= margin.top + innerHeight;

      // Set appropriate cursor
      if (isOverXAxis) {
        container.style.cursor = 'ew-resize';
      } else if (isOverYAxis || isOverY2Axis) {
        container.style.cursor = 'ns-resize';
      } else {
        container.style.cursor = 'default';
      }
    };

    // Add non-passive event listener for wheel events
    container.addEventListener('wheel', handleWheel, { passive: false });
    // Add mousemove event listener for cursor feedback
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [currentXExtent, currentYExtent, currentY2Extent, innerWidth, innerHeight, margin, chartId, height, y2Field, width, data]);

  // Early return for empty data with basic chart structure
  if (!data || data.length === 0) {
    console.log(`📊 No data provided - rendering empty chart container`);
    return (
      <div
        style={{ position: 'relative' }}
        data-chart-id={`chart-${chartId}`}
      >
        <ChartContainer width={width} height={height} margin={margin}>
          <text 
            x={innerWidth / 2} 
            y={innerHeight / 2} 
            textAnchor="middle" 
            fill="#6b7280"
            fontSize="14"
          >
            No data available
          </text>
        </ChartContainer>
      </div>
    );
  }

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

  // Apply zoom limits to prevent excessive zooming
  const applyZoomLimits = (newDomain: [any, any], originalExtent: [any, any]) => {
    const zoomLevel = getZoomLevel(originalExtent, newDomain);
    if (zoomLevel < MIN_ZOOM || zoomLevel > MAX_ZOOM) {
      return null; // Reject zoom
    }
    return newDomain;
  };

  const xZoomLevel = xDomain ? getZoomLevel(originalXExtent as [any, any], xDomain) : 1;
  const yZoomLevel = yDomain ? getZoomLevel(originalYExtent as [any, any], yDomain) : 1;
  const y2ZoomLevel = y2Domain ? getZoomLevel(originalY2Extent as [any, any], y2Domain) : 1;

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

  // Calculate responsive legend position based on viewport width
  const getResponsiveLegendPosition = (hasY2Axis: boolean) => {
    if (isNarrowViewport) {
      // Move legend below chart to prevent overflow at narrow widths
      return { x: 20, y: innerHeight + 40 };
    } else {
      // Standard right position for wider viewports
      return { x: innerWidth + (hasY2Axis ? 85 : 20), y: 0 };
    }
  };

  const legendPosition = getResponsiveLegendPosition(!!y2Field);
  const legendSpacing = isNarrowViewport ? 10 : 20; // Tighter spacing on narrow viewports

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
            <rect x={30} y={0} width={innerWidth - 60} height={innerHeight} />
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
            labelOffset={{ x: -innerHeight / 2, y: -(margin.left - 15) }}
          />

          {/* Secondary Y-axis (right side) */}
          {y2Field && y2Scale && (
            <Axis
              scale={y2Scale}
              orientation="right"
              transform={`translate(${innerWidth},0)`}
              label={formatFieldName(String(y2Field))}
              labelOffset={{ x: -innerHeight / 2, y: margin.right > 150 ? 60 : 40 }}
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

          {/* Reset button - responsive positioning */}
          {hasSelections && (
            <g
              transform={`translate(${legendPosition.x}, ${legendPosition.y - 40})`}
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

          {/* Legends - responsive positioning based on viewport width */}
          <Legend
            title={formatFieldName(String(colorField))}
            items={colorLegendItems}
            x={legendPosition.x}
            y={legendPosition.y}
            selectedItems={selectedColorItems}
            onItemClick={handleColorLegendClick}
            hasOtherSelections={selectedShapeItems.size > 0}
          />

          {shapeLegendItems.length > 0 && (
            <Legend
              title={formatFieldName(String(shapeField!))}
              items={shapeLegendItems}
              x={legendPosition.x}
              y={legendPosition.y + legendSpacing + colorLegendItems.length * legendSpacing}
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

          {/* Secondary Y-axis zoom area (right side) - responsive width */}
          {y2Field && !isNarrowViewport && (
            <rect
              x={innerWidth}
              y={0}
              width={85} // Extended to match legend start position
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