'use client';

import React from 'react';
import { SPCCdL1Item } from '@/services/spcCdL1Service';
import { useSPCCdL1 } from '@/contexts/SPCCdL1Context';
import SPCTimeline from './SPCTimeline';
import { SPCVariabilityChart } from './SPCVariabilityChart';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';
import SPCChartWrapper from './SPCChartWrapper';
import CollapsibleStatistics from './CollapsibleStatistics';

interface SPCChartWithSharedDataProps {
  title: string;
  data: SPCCdL1Item[];
  yField: keyof SPCCdL1Item;
  y2Field?: keyof SPCCdL1Item;
  colorField?: keyof SPCCdL1Item;
  shapeField?: keyof SPCCdL1Item;
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
  const { allEntityData, filters } = useSPCCdL1();

  // Use all entity data for scale calculation (variability chart needs all entities)
  const dataForScaleCalculation = allEntityData.length > 0 ? allEntityData : data;

  // Define margins - consistent for both charts
  const chartMargin = { top: 30, right: 240, bottom: 60, left: 70 };

  // Map yField to metric type for statistics
  const getMetricType = (): 'cd_att' | 'cd_x_y' | 'cd_6sig' => {
    switch (yField) {
      case 'cd_att':
        return 'cd_att';
      case 'cd_x_y':
        return 'cd_x_y';
      case 'cd_6sig':
        return 'cd_6sig';
      default:
        return 'cd_att'; // fallback
    }
  };

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
          metric={getMetricType()}
          chartTitle={getChartTitleForStats()}
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