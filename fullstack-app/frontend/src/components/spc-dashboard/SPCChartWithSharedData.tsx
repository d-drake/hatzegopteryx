'use client';

import React, { useState, useEffect } from 'react';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';
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
}: SPCChartWithSharedDataProps) {
  const { filters } = useCDData();
  const [allEntityData, setAllEntityData] = useState<CDDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract process info from first data item
  const spcMonitorName = data[0]?.spc_monitor_name || spcMonitor;

  useEffect(() => {
    const loadAllEntityData = async () => {
      if (!processType || !productType || !spcMonitorName) return;

      try {
        setIsLoading(true);
        // Fetch data with all filters except entity filter
        const filterParams = {
          limit: 1000,
          process_type: processType,
          product_type: productType,
          spc_monitor_name: spcMonitorName,
          // Apply date filters but NOT entity filter
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate })
        };

        const response = await fetchCDData(filterParams);
        setAllEntityData(response);
      } catch (error) {
        console.error('Error loading unfiltered entity data:', error);
        // Fallback to provided data
        setAllEntityData(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllEntityData();
  }, [processType, productType, spcMonitorName, filters.startDate, filters.endDate, data]);

  // Use original data until all entity data is loaded
  const dataForScaleCalculation = isLoading ? data : allEntityData;

  // Define margins - consistent for both charts
  const chartMargin = { top: 30, right: 240, bottom: 60, left: 70 };

  return (
    <SPCChartWrapper
      title={title}
      tabs={[
        {
          id: 'timeline',
          label: 'Timeline',
          content: (
            <ResponsiveChartWrapper>
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
            <ResponsiveChartWrapper>
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