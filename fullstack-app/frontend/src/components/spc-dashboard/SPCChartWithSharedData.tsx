'use client';

import React from 'react';
import { CDDataItem } from '@/services/cdDataService';
import { useCDData } from '@/contexts/CDDataContext';
import SPCTimeline from './SPCTimeline';
import { SPCVariabilityChart } from './SPCVariabilityChart';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';
import SPCChartWrapper from './SPCChartWrapper';

interface SPCChartWithSharedDataProps {
  title: string;
  data: CDDataItem[];
  yField: keyof CDDataItem;
  y2Field?: keyof CDDataItem;
  colorField?: keyof CDDataItem;
  shapeField?: keyof CDDataItem;
  processType: string;
  productType: string;
  spcMonitor: string;
  syncViews?: boolean;
  activeView?: 'timeline' | 'variability';
  onViewChange?: (view: 'timeline' | 'variability') => void;
}

export default function SPCChartWithSharedData({
  title,
  data,
  yField,
  y2Field,
  colorField,
  shapeField,
  processType,
  productType,
  spcMonitor,
  syncViews = false,
  activeView = 'timeline',
  onViewChange,
}: SPCChartWithSharedDataProps) {
  const { allEntityData } = useCDData();

  // Use all entity data for scale calculation (variability chart needs all entities)
  const dataForScaleCalculation = allEntityData.length > 0 ? allEntityData : data;

  // Define margins - consistent for both charts
  const chartMargin = { top: 30, right: 240, bottom: 60, left: 70 };

  return (
    <SPCChartWrapper
      title={title}
      syncViews={syncViews}
      activeView={activeView}
      onViewChange={onViewChange}
      tabs={[
        {
          id: 'timeline',
          label: 'Timeline',
          content: (
            <ResponsiveChartWrapper padding={48}>
              {(width) => (
                <SPCTimeline
                  data={data}
                  allData={dataForScaleCalculation}
                  xField="date_process"
                  yField={yField}
                  y2Field={y2Field}
                  colorField={colorField}
                  shapeField={shapeField}
                  width={width}
                  height={400}
                  margin={chartMargin}
                  processType={processType}
                  productType={productType}
                  spcMonitorName={spcMonitor}
                />
              )}
            </ResponsiveChartWrapper>
          )
        },
        {
          id: 'variability',
          label: 'Variability',
          content: (
            <ResponsiveChartWrapper padding={48}>
              {(width) => (
                <SPCVariabilityChart
                  data={dataForScaleCalculation}
                  chartMeasurement={yField as string}
                  width={width}
                  height={400}
                  margin={chartMargin}
                  processType={processType}
                  productType={productType}
                  spcMonitorName={spcMonitor}
                />
              )}
            </ResponsiveChartWrapper>
          )
        }
      ]}
    />
  );
}