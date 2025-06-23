'use client';

import Timeline from '@/components/charts/Timeline';
import { CDDataItem } from '@/services/cdDataService';
import LimitLine from './LimitLine';

interface SPCTimelineProps {
  data: CDDataItem[];
  xField: keyof CDDataItem;
  yField: keyof CDDataItem;
  y2Field?: keyof CDDataItem; // Secondary Y-axis field
  colorField?: keyof CDDataItem;
  shapeField?: keyof CDDataItem;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  processType?: string;
  productType?: string;
  spcMonitorName?: string;
}

export default function SPCTimeline({
  data,
  xField,
  yField,
  y2Field,
  colorField = 'entity',
  shapeField,
  width = 800,
  height = 500,
  margin = { top: 20, right: 150, bottom: 60, left: 70 },
  processType,
  productType,
  spcMonitorName,
}: SPCTimelineProps) {
  // Apply SPC-specific defaults
  // For bias fields, use bias coloring
  const effectiveColorField = yField.toString().includes('bias') ? yField : colorField;
  
  // For CD ATT charts, use fake_property1 for shapes
  const effectiveShapeField = yField === 'cd_att' ? 'fake_property1' : shapeField;

  // Map yField to chart name for SPC limits
  const getChartName = (field: keyof CDDataItem): string => {
    switch (field) {
      case 'cd_att': return 'cd_att';
      case 'cd_x_y': return 'cd_x_y';
      case 'cd_6sig': return 'cd_6sig';
      case 'bias': return 'bias';
      case 'bias_x_y': return 'bias_x_y';
      default: return field.toString();
    }
  };

  const chartName = getChartName(yField);

  return (
    <Timeline<CDDataItem>
      data={data}
      xField={xField}
      yField={yField}
      y2Field={y2Field}
      colorField={effectiveColorField}
      shapeField={effectiveShapeField}
      lineGroupField="entity"
      width={width}
      height={height}
      margin={margin}
      renderOverlays={(scales) => {
        // Only render SPC limits if metadata is available
        if (!processType || !productType || !spcMonitorName) {
          return null;
        }

        return (
          <>
            <LimitLine
              type="CL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
            <LimitLine
              type="LCL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
            <LimitLine
              type="UCL"
              yScale={scales.yScale}
              xScale={scales.xScale}
              chartName={chartName}
              processType={processType}
              productType={productType}
              spcMonitorName={spcMonitorName}
            />
          </>
        );
      }}
    />
  );
}