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
import { CDDataItem } from '@/services/cdDataService';

interface ScatterPlotProps {
  data: CDDataItem[];
  xField: keyof CDDataItem;
  yField: keyof CDDataItem;
  colorField?: keyof CDDataItem;
  shapeField?: keyof CDDataItem;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function ScatterPlot({
  data,
  xField,
  yField,
  colorField = 'entity',
  shapeField,
  width = 800,
  height = 500,
  margin = { top: 20, right: 150, bottom: 60, left: 70 },
}: ScatterPlotProps) {
  const { innerWidth, innerHeight } = useChartDimensions(width, height, margin);
  const { showTooltip, hideTooltip } = useTooltip();

  // Create scales
  const xScale = useMemo(() => {
    if (xField === 'date_process') {
      return createTimeScale(getDateExtent(data, xField), [0, innerWidth]);
    } else {
      return createLinearScale(getNumericExtent(data, xField), [0, innerWidth]);
    }
  }, [data, xField, innerWidth]);

  const yScale = useMemo(
    () => createLinearScale(getNumericExtent(data, yField), [innerHeight, 0]),
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

  // Accessor functions
  const xAccessor = (d: CDDataItem) => {
    if (xField === 'date_process') {
      return (xScale as any)(new Date(String(d[xField])));
    } else {
      return (xScale as any)(Number(d[xField]));
    }
  };
  const yAccessor = (d: CDDataItem) => yScale(Number(d[yField]));
  const colorAccessor = (d: CDDataItem) => String(d[colorField]);
  const shapeAccessor = shapeField ? (d: CDDataItem) => String(d[shapeField]) : undefined;

  // Handle hover
  const handleHover = (event: MouseEvent, datum: CDDataItem | null) => {
    if (datum) {
      const tooltipFields = [xField, yField];
      if (colorField) tooltipFields.push(colorField);
      if (shapeField) tooltipFields.push(shapeField);
      
      // Add fake_property1 and fake_property2 if not already included
      if (!tooltipFields.includes('fake_property1')) tooltipFields.push('fake_property1');
      if (!tooltipFields.includes('fake_property2')) tooltipFields.push('fake_property2');
      
      const content = formatTooltipContent(datum as any, tooltipFields);
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
        label={formatFieldName(xField)}
        labelOffset={{ x: innerWidth / 2, y: 45 }}
      />
      <Axis
        scale={yScale}
        orientation="left"
        label={formatFieldName(yField)}
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

      {/* Connection lines by entity */}
      <Line
        data={data}
        xAccessor={xAccessor}
        yAccessor={yAccessor}
        groupBy={colorAccessor}
        stroke="#666666"
        strokeWidth={1}
        strokeOpacity={0.4}
      />

      {/* Legends */}
      <Legend
        title={formatFieldName(colorField)}
        items={colorLegendItems}
        x={innerWidth + 20}
        y={20}
      />
      
      {shapeLegendItems.length > 0 && (
        <Legend
          title={formatFieldName(shapeField!)}
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
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Cd', 'CD')
    .replace('Att', 'ATT')
    .replace('Sig', 'Sig')
    .replace('X Y', 'X/Y')
    .replace('Datetime', 'Date Time')
    .replace('Fake Property', 'Property');
}