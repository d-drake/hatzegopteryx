'use client';

import Timeline from '@/components/charts/Timeline';
import { CDDataItem } from '@/services/cdDataService';

interface SPCTimelineProps {
  data: CDDataItem[];
  xField: keyof CDDataItem;
  yField: keyof CDDataItem;
  colorField?: keyof CDDataItem;
  shapeField?: keyof CDDataItem;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function SPCTimeline({
  data,
  xField,
  yField,
  colorField = 'entity',
  shapeField,
  width = 800,
  height = 500,
  margin = { top: 20, right: 150, bottom: 60, left: 70 },
}: SPCTimelineProps) {
  // Apply SPC-specific defaults
  // For bias fields, use bias coloring
  const effectiveColorField = yField.toString().includes('bias') ? yField : colorField;
  
  // For CD ATT charts, use fake_property1 for shapes
  const effectiveShapeField = yField === 'cd_att' ? 'fake_property1' : shapeField;

  return (
    <Timeline<CDDataItem>
      data={data}
      xField={xField}
      yField={yField}
      colorField={effectiveColorField}
      shapeField={effectiveShapeField}
      width={width}
      height={height}
      margin={margin}
    />
  );
}