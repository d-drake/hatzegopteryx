'use client';

import React from 'react';
import { getSPCDataSourceConfig } from '@/lib/spc-dashboard/spcDataSourceRegistry';
import SPCTimeline from './SPCTimeline';
import { SPCVariabilityChart } from './SPCVariabilityChart';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';
import SPCChartWrapper from './SPCChartWrapper';
import CollapsibleStatistics from './CollapsibleStatistics';

interface SPCChartWithSharedDataProps {
  title: string;
  data: any[]; // Generic data array
  yField: string;
  y2Field?: string;
  colorField?: string;
  shapeField?: string;
  processType: string;
  productType: string;
  spcMonitor: string;
  syncViews?: boolean;
  activeView?: 'timeline' | 'variability';
  onViewChange?: (view: 'timeline' | 'variability') => void;
  statisticsCollapsed?: boolean;
  onToggleStatisticsCollapsed?: () => void;
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
  statisticsCollapsed,
  onToggleStatisticsCollapsed,
}: SPCChartWithSharedDataProps) {
  // Get configuration for this SPC monitor
  const config = getSPCDataSourceConfig(spcMonitor);
  
  // Use the appropriate context hook
  const contextData = config.contextHook();
  
  // Generic data access using configuration
  const allEntityData = contextData.allEntityData || [];
  const filters = contextData.filters || {};

  // Use all entity data for scale calculation (variability chart needs all entities)
  const dataForScaleCalculation = allEntityData.length > 0 ? allEntityData : data;

  // Define margins - consistent for both charts
  const chartMargin = { top: 30, right: 240, bottom: 60, left: 70 };

  // Conditional rendering based on data source capabilities
  const effectiveShapeField = config.dataFields.hasShapeField ? shapeField : undefined;

  // Get chart title without "vs Date" suffix for statistics
  const getChartTitleForStats = () => {
    return title.replace(' vs Date', '');
  };

  return (
    <SPCChartWrapper
      title={title}
      syncViews={syncViews}
      activeView={activeView}
      onViewChange={onViewChange}
      bottomContent={
        <CollapsibleStatistics
          data={dataForScaleCalculation}
          metric={yField}
          chartTitle={getChartTitleForStats()}
          config={config.statisticsConfig}
          isCollapsed={statisticsCollapsed}
          onToggleCollapsed={onToggleStatisticsCollapsed}
        />
      }
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
                  shapeField={effectiveShapeField}
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