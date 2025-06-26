'use client';

import ResponsiveChartContainer, { ChartDimensions } from './ResponsiveChartContainer';
import ChartMinWidthMessage from './ChartMinWidthMessage';
import Timeline from './Timeline';

interface ResponsiveTimelineProps<T extends Record<string, any>> {
  data: T[];
  xField: keyof T;
  yField: keyof T;
  y2Field?: keyof T;
  colorField?: keyof T;
  shapeField?: keyof T;
  lineGroupField?: keyof T;
  yScale?: any; // Optional shared Y-axis scale
  renderOverlays?: (scales: {
    xScale: any;
    yScale: any;
    y2Scale?: any;
    clipPathId?: string;
  }) => React.ReactNode;
  tooltipMetadata?: Record<string, any>;
  minWidth?: number;
  className?: string;
}

export default function ResponsiveTimeline<T extends Record<string, any>>({
  data,
  xField,
  yField,
  y2Field,
  colorField = 'entity',
  shapeField,
  lineGroupField,
  yScale,
  renderOverlays,
  tooltipMetadata,
  minWidth = 375,
  className,
}: ResponsiveTimelineProps<T>) {
  return (
    <ResponsiveChartContainer
      minWidth={minWidth}
      fallbackComponent={ChartMinWidthMessage}
      className={className}
      onBreakpointChange={(isNarrow) => {
        // Optional: Could be used for additional responsive behavior
        console.log(`Chart viewport is ${isNarrow ? 'narrow' : 'wide'}`);
      }}
    >
      {(dimensions: ChartDimensions) => (
        <Timeline
          data={data}
          xField={xField}
          yField={yField}
          y2Field={y2Field}
          colorField={colorField}
          shapeField={shapeField}
          lineGroupField={lineGroupField}
          yScale={yScale}
          width={dimensions.width}
          height={dimensions.height}
          margin={dimensions.margin}
          renderOverlays={renderOverlays}
          tooltipMetadata={tooltipMetadata}
          isNarrowViewport={dimensions.width < 768} // Pass narrow viewport flag
        />
      )}
    </ResponsiveChartContainer>
  );
}