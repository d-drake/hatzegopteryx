'use client';

import { useMemo, useRef, useEffect, useState, useId, useCallback } from 'react';
import ChartContainer, { useEnhancedChartDimensions } from './ChartContainer';
import Axis from './Axis';
import Circles from './Circles';
import Symbols from './Symbols';
import Line from './Line';
import MultiColumnLegend from './MultiColumnLegend';
import HorizontalLegend from './HorizontalLegend';
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
import * as d3 from 'd3';

// Removed obsolete DOM-based coordinate system types

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
  yScale?: d3.ScaleLinear<number, number>; // External Y scale for synchronization (deprecated)
  onYScaleChange?: (scale: d3.ScaleLinear<number, number>) => void; // Callback when Y scale changes (deprecated)
  allData?: T[]; // All data for scale calculation (may be different from displayed data)
  xZoomDomain?: [number, number] | [Date, Date] | null; // X-axis zoom domain
  yZoomDomain?: [number, number] | null; // Y-axis zoom domain
  y2ZoomDomain?: [number, number] | null; // Y2-axis zoom domain
  onXZoomChange?: (domain: [number, number] | [Date, Date] | null) => void; // Callback for X zoom
  onYZoomChange?: (domain: [number, number] | null) => void; // Callback for Y zoom
  onY2ZoomChange?: (domain: [number, number] | null) => void; // Callback for Y2 zoom
  onResetZoom?: () => void; // Callback for reset zoom
}


// Removed obsolete DOM-based coordinate system functions

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
  margin = { top: 60, right: 240, bottom: 60, left: 70 },
  renderOverlays,
  tooltipMetadata,
  yScale: externalYScale,
  onYScaleChange,
  allData,
  xZoomDomain: externalXZoomDomain,
  yZoomDomain: externalYZoomDomain,
  y2ZoomDomain: externalY2ZoomDomain,
  onXZoomChange,
  onYZoomChange,
  onY2ZoomChange,
  onResetZoom,
}: TimelineProps<T>) {
  // Track if SVG width is narrow (< 800px)
  const isNarrowSVG = width < 800;

  // Dynamic right margin state - must be declared before using it
  const [dynamicRightMargin, setDynamicRightMargin] = useState(80);

  // Calculate responsive margins with dynamic right margin
  const responsiveMargin = useMemo(() =>
    isNarrowSVG
      ? { top: 40, right: y2Field ? Math.max(dynamicRightMargin, 60) : 10, bottom: 80, left: 50 }
      : { ...margin, right: y2Field ? Math.max(margin.right, dynamicRightMargin) : margin.right },
    [isNarrowSVG, y2Field, dynamicRightMargin, margin]
  );

  const chartDimensions = useEnhancedChartDimensions(width, height, responsiveMargin, {
    hasY2Axis: !!y2Field,
  });
  const { innerWidth, innerHeight, axisRegions, screenToChart, getAxisRegion } = chartDimensions;
  const { showTooltip, hideTooltip } = useTooltip();
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<SVGGElement>(null);
  const clipPathId = useId();

  // Zoom state - initialize Y domain from prop if provided
  const [xDomain, setXDomain] = useState<[any, any] | null>(null);
  const [yDomain, setYDomain] = useState<[any, any] | null>(externalYZoomDomain || null);
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

  const originalYExtent = useMemo(() => {
    // Use allData for scale calculation if provided, otherwise use displayed data
    const dataForScale = allData || data;
    return getNumericExtent(dataForScale, yField);
  }, [allData, data, yField]);

  const originalY2Extent = useMemo(() =>
    y2Field ? getNumericExtent(data, y2Field) : [0, 1] as [number, number],
    [data, y2Field]
  );

  // Use zoomed domains if available, otherwise use original extents
  const currentXExtent = xDomain || originalXExtent;
  const currentYExtent = yDomain || (externalYScale ? externalYScale.domain() as [number, number] : originalYExtent);
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

  const yScale = useMemo(() => {
    if (externalYScale) {
      return externalYScale.copy().range([innerHeight, 0]);
    }
    return createLinearScale(currentYExtent, [innerHeight, 0]);
  }, [externalYScale, currentYExtent, innerHeight]);

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

  const yDataScale = useMemo(() => {
    if (externalYScale) {
      return externalYScale.copy().range([innerHeight, 0]);
    }
    return createLinearScale(currentYExtent, [innerHeight, 0]);
  }, [externalYScale, currentYExtent, innerHeight]);

  const y2DataScale = useMemo(
    () => y2Field ? createLinearScale(currentY2Extent, [innerHeight, 0]) : null,
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

      // Check if point is within the clipped area (30px margins on left/right, full height)
      const xInBounds = x >= 30 && x <= innerWidth - 30;
      const yInBounds = y >= 0 && y <= innerHeight;
      const y2InBounds = y2 === null || (y2 >= 0 && y2 <= innerHeight);

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

  // Notify parent of initial scale creation (deprecated - for backward compatibility)
  useEffect(() => {
    if (!externalYScale && onYScaleChange && yScale) {
      onYScaleChange(yScale);
    }
  }, [yScale, externalYScale, onYScaleChange]);

  // Measure right axis labels after render
  useEffect(() => {
    if (!y2Field || !svgRef.current) return;

    // Find all right axis tick labels
    const rightAxisLabels = svgRef.current.querySelectorAll('.axis:last-of-type .tick text');
    let maxWidth = 0;

    rightAxisLabels.forEach((label) => {
      const bbox = (label as SVGTextElement).getBBox();
      maxWidth = Math.max(maxWidth, bbox.width);
    });

    // Add padding for the axis label itself and some buffer
    const totalRightMargin = maxWidth + 60; // 80px for axis label and padding

    // Only update if significantly different to avoid infinite loops
    if (Math.abs(totalRightMargin - dynamicRightMargin) > 5) {
      setDynamicRightMargin(totalRightMargin);
    }
  }, [y2Field, y2Scale, currentY2Extent, isNarrowSVG, dynamicRightMargin]);

  // Update local domains when props change
  useEffect(() => {
    setXDomain(externalXZoomDomain || null);
  }, [externalXZoomDomain]);

  useEffect(() => {
    setYDomain(externalYZoomDomain || null);
  }, [externalYZoomDomain]);

  useEffect(() => {
    setY2Domain(externalY2ZoomDomain || null);
  }, [externalY2ZoomDomain]);

  // Set up wheel event listener with non-passive option
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const { x: chartX, y: chartY } = screenToChart(event.clientX, event.clientY, rect);

      // Use centralized axis region detection
      const axisRegion = getAxisRegion(chartX, chartY);

      // Update cursor based on which axis region we're in
      if (axisRegion && axisRegions[axisRegion]) {
        svg.style.cursor = axisRegions[axisRegion].cursor;
      } else {
        svg.style.cursor = 'default';
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const rect = svg.getBoundingClientRect();
      const { x: chartX, y: chartY } = screenToChart(event.clientX, event.clientY, rect);

      // Use centralized axis region detection
      const axisRegion = getAxisRegion(chartX, chartY);

      // Only prevent default and handle zoom if we're in an axis region
      if (axisRegion) {
        event.preventDefault();
        event.stopPropagation();

        const zoomFactor = 1.2;
        const zoomIn = event.deltaY < 0;
        const scale = zoomIn ? zoomFactor : 1 / zoomFactor;

        if (axisRegion === 'bottom') {
          // Zoom X-axis by updating the domain state
          const [min, max] = currentXExtent;

          // Handle dates differently from numbers
          if (min instanceof Date && max instanceof Date) {
            const minTime = min.getTime();
            const maxTime = max.getTime();
            const range = maxTime - minTime;
            const center = minTime + range * 0.5;
            const newRange = range / scale;

            const newXDomain: [Date, Date] = [new Date(center - newRange * 0.5), new Date(center + newRange * 0.5)];
            setXDomain(newXDomain);

            // Notify parent component
            if (onXZoomChange) {
              onXZoomChange(newXDomain);
            }
          } else {
            // Handle numeric values
            const range = max - min;
            const center = min + range * 0.5;
            const newRange = range / scale;

            const newXDomain: [number, number] = [center - newRange * 0.5, center + newRange * 0.5];
            setXDomain(newXDomain);

            // Notify parent component
            if (onXZoomChange) {
              onXZoomChange(newXDomain);
            }
          }
        }

        if (axisRegion === 'left') {
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

          // Removed deprecated onYScaleChange handling
        }

        if (axisRegion === 'right') {
          // Zoom secondary Y-axis by updating the domain state
          const [min, max] = currentY2Extent;
          const range = max - min;
          const center = min + range * 0.5;
          const newRange = range / scale;

          const newY2Domain: [number, number] = [center - newRange * 0.5, center + newRange * 0.5];
          setY2Domain(newY2Domain);

          // Notify parent component
          if (onY2ZoomChange) {
            onY2ZoomChange(newY2Domain);
          }
        }
      }
    };

    // Add event listeners directly to the SVG element
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [currentXExtent, currentYExtent, currentY2Extent, screenToChart, getAxisRegion, axisRegions, onXZoomChange, onYZoomChange, onY2ZoomChange]);

  // Reset zoom function
  const resetZoom = () => {
    // If parent handles reset, use that
    if (onResetZoom) {
      onResetZoom();
    } else {
      // Otherwise, do local reset
      setXDomain(null);
      setYDomain(null);
      setY2Domain(null);

      // Notify parent of reset via domain change
      if (onXZoomChange) {
        onXZoomChange(null);
      }
      if (onYZoomChange) {
        onYZoomChange(null);
      }
      if (onY2ZoomChange) {
        onY2ZoomChange(null);
      }

      // Removed deprecated onYScaleChange handling
    }
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


      <ChartContainer width={width} height={height} margin={responsiveMargin} ref={svgRef}>
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
            labelOffset={{ x: innerWidth / 2, y: isNarrowSVG ? 45 : 45 }}
            responsive={isNarrowSVG}
            screenWidth={width}
          />
          <Axis
            scale={yScale}
            orientation="left"
            label={formatFieldName(String(yField))}
            labelOffset={{ x: -innerHeight / 2, y: -50 }}
            responsive={isNarrowSVG}
            screenWidth={width}
          />

          {/* Secondary Y-axis (right side) */}
          {y2Field && y2Scale && (
            <Axis
              scale={y2Scale}
              orientation="right"
              transform={`translate(${innerWidth},0)`}
              label={formatFieldName(String(y2Field))}
              labelOffset={{ x: -innerHeight / 2, y: 60 }}
              responsive={isNarrowSVG}
              screenWidth={width}
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

          {/* Legends - render inside SVG for wide SVGs, outside for narrow */}
          {!isNarrowSVG && (
            <>
              <MultiColumnLegend
                title={formatFieldName(String(colorField))}
                items={colorLegendItems}
                x={innerWidth + (y2Field ? 85 : 20)}
                y={0}
                selectedItems={selectedColorItems}
                onItemClick={handleColorLegendClick}
                hasOtherSelections={selectedShapeItems.size > 0}
                maxHeight={innerHeight}
                columnGap={30}
                maxColumns={3}
              />

              {shapeLegendItems.length > 0 && (
                <MultiColumnLegend
                  title={formatFieldName(String(shapeField!))}
                  items={shapeLegendItems}
                  x={innerWidth + (y2Field ? 85 : 20)}
                  y={20 + Math.min(colorLegendItems.length * 20, innerHeight)}
                  selectedItems={selectedShapeItems}
                  onItemClick={handleShapeLegendClick}
                  hasOtherSelections={selectedColorItems.size > 0}
                  maxHeight={innerHeight - 20 - Math.min(colorLegendItems.length * 20, innerHeight)}
                  columnGap={30}
                  maxColumns={3}
                />
              )}
            </>
          )}

          {/* Zoom areas for user guidance - using centralized axis regions */}

          {/* Bottom axis (X-axis) zoom area */}
          {axisRegions.bottom && (
            <rect
              x={axisRegions.bottom.x}
              y={axisRegions.bottom.y}
              width={axisRegions.bottom.width}
              height={axisRegions.bottom.height}
              fill="transparent"
              style={{ cursor: axisRegions.bottom.cursor }}
            />
          )}

          {/* Left axis (Y-axis) zoom area */}
          {axisRegions.left && (
            <rect
              x={axisRegions.left.x}
              y={axisRegions.left.y}
              width={axisRegions.left.width}
              height={axisRegions.left.height}
              fill="transparent"
              style={{ cursor: axisRegions.left.cursor }}
            />
          )}

          {/* Right axis (Y2-axis) zoom area */}
          {axisRegions.right && (
            <rect
              x={axisRegions.right.x}
              y={axisRegions.right.y}
              width={axisRegions.right.width}
              height={axisRegions.right.height}
              fill="transparent"
              style={{ cursor: axisRegions.right.cursor }}
            />
          )}

        </g>
      </ChartContainer>

      {/* Horizontal legends for narrow SVGs */}
      {isNarrowSVG && (
        <div className="mt-2 space-y-2">
          <HorizontalLegend
            title={formatFieldName(String(colorField))}
            items={colorLegendItems}
            selectedItems={selectedColorItems}
            onItemClick={handleColorLegendClick}
            hasOtherSelections={selectedShapeItems.size > 0}
          />

          {shapeLegendItems.length > 0 && (
            <HorizontalLegend
              title={formatFieldName(String(shapeField!))}
              items={shapeLegendItems}
              selectedItems={selectedShapeItems}
              onItemClick={handleShapeLegendClick}
              hasOtherSelections={selectedColorItems.size > 0}
            />
          )}

          {/* Reset selections button for mobile */}
          {hasSelections && (
            <button
              onClick={resetLegendSelections}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Reset Selections
            </button>
          )}
        </div>
      )}
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