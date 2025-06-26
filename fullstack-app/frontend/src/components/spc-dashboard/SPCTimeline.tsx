'use client';

import { useState, useEffect } from 'react';
import Timeline from '@/components/charts/Timeline';
import { CDDataItem, fetchSPCLimits, SPCLimit } from '@/services/cdDataService';
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
  margin = { top: 30, right: 240, bottom: 60, left: 70 },
  processType,
  productType,
  spcMonitorName,
}: SPCTimelineProps) {
  const [spcLimits, setSpcLimits] = useState<SPCLimit[]>([]);
  const [limitsLoading, setLimitsLoading] = useState(false);
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

  // Fetch SPC limits when parameters change
  useEffect(() => {
    if (!processType || !productType || !spcMonitorName) {
      setSpcLimits([]);
      return;
    }

    const fetchLimits = async () => {
      try {
        setLimitsLoading(true);
        const limitsData = await fetchSPCLimits({
          process_type: processType,
          product_type: productType,
          spc_monitor_name: spcMonitorName,
          spc_chart_name: chartName
        });
        setSpcLimits(limitsData);
      } catch (error) {
        console.error('Error fetching SPC limits:', error);
        setSpcLimits([]);
      } finally {
        setLimitsLoading(false);
      }
    };

    fetchLimits();
  }, [processType, productType, spcMonitorName, chartName]);

  // Create tooltip metadata with current SPC limits
  const tooltipMetadata = spcLimits.length > 0 ? {
    cl: spcLimits[0]?.cl,
    lcl: spcLimits[0]?.lcl,
    ucl: spcLimits[0]?.ucl
  } : undefined;

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
      tooltipMetadata={tooltipMetadata}
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