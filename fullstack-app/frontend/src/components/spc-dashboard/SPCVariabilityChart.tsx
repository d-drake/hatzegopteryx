'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { VariabilityChart } from '../charts/VariabilityChart';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';
import { useCDData } from '@/contexts/CDDataContext';
import type { ScaleLinear } from 'd3-scale';

interface SPCVariabilityChartProps {
  data: any[];
  chartMeasurement: string;
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  yScale?: ScaleLinear<number, number>;
  onYScaleChange?: (scale: ScaleLinear<number, number>) => void;
}

export const SPCVariabilityChart: React.FC<SPCVariabilityChartProps> = ({
  data,
  chartMeasurement,
  width,
  height,
  margin = { top: 20, right: 50, bottom: 80, left: 80 },
  yScale,
  onYScaleChange,
}) => {
  const { filters } = useCDData();
  const [allEntityData, setAllEntityData] = useState<CDDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract process info from first data item
  const processType = data[0]?.process_type;
  const productType = data[0]?.product_type;
  const spcMonitorName = data[0]?.spc_monitor_name;

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
  }, [processType, productType, spcMonitorName, filters.startDate, filters.endDate]);

  const dataToUse = isLoading ? data : allEntityData;

  return (
    <VariabilityChart
      data={dataToUse}
      categoricalColumn="entity"
      valueColumn={chartMeasurement}
      width={width}
      height={height}
      margin={margin}
      yScale={yScale}
      onYScaleChange={onYScaleChange}
    />
  );
};