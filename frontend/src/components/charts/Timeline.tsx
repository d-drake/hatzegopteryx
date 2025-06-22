'use client';

import { useMemo } from 'react';
import ChartContainer, { useChartDimensions } from './ChartContainer';
import Axis from './Axis';
import Circles from './Circles';
import Symbols from './Symbols';
import Line from './Line';
import Legend from './Legend';
import { useTooltip, formatTooltipContent } from './Tooltip';
import {
  createLinearScale,
  createTimeScale,
  createColorScale,
  createShapeScale,
  getUniqueValues,
  getNumericExtent,
  getDateExtent,
} from './scales';
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

  // Create scales - axes connect at origin, data maintains 30px margins
  const xScale = useMemo(() => {
    // Check if the first data point's xField value is a date
    if (data.length > 0) {
      const firstValue = data[0][xField];
      if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
        return createTimeScale(getDateExtent(data, xField), [0, innerWidth]);
      }
    }
    return createLinearScale(getNumericExtent(data, xField), [0, innerWidth]);
  }, [data, xField, innerWidth]);

  const yScale = useMemo(
    () => createLinearScale(getNumericExtent(data, yField), [innerHeight, 0]),
    [data, yField, innerHeight]
  );

  // Create data scales with margins for positioning data points
  const xDataScale = useMemo(() => {
    if (data.length > 0) {
      const firstValue = data[0][xField];
      if ((firstValue as any) instanceof Date || (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue as string)))) {
        return createTimeScale(getDateExtent(data, xField), [30, innerWidth - 30]);
      }
    }
    return createLinearScale(getNumericExtent(data, xField), [30, innerWidth - 30]);
  }, [data, xField, innerWidth]);

  const yDataScale = useMemo(
    () => createLinearScale(getNumericExtent(data, yField), [innerHeight - 30, 30]),
    [data, yField, innerHeight]
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

  return (
    <ChartContainer width={width} height={height} margin={margin}>
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
      {shapeField && shapeScale ? (
        <Symbols
          data={data}
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
          data={data}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
          colorAccessor={colorAccessor}
          colorScale={colorScale}
          onHover={handleHover}
        />
      )}

      {/* Connection lines by group field */}
      <Line
        data={data}
        xAccessor={xAccessor}
        yAccessor={yAccessor}
        groupBy={lineGroupAccessor}
        stroke="#666666"
        strokeWidth={1}
        strokeOpacity={0.4}
      />

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
    </ChartContainer>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}