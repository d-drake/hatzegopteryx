'use client';

import { useMemo } from 'react';
import VariabilityChart from '@/components/charts/VariabilityChart';
import { CDDataItem } from '@/services/cdDataService';

interface SPCVariabilityChartProps {
  data: CDDataItem[];
  yField: 'cd_att' | 'cd_x_y' | 'cd_6sig';
  startDate?: Date;
  endDate?: Date;
  yScale?: any; // Shared Y-axis scale from adjacent Timeline
  width?: number;
  height?: number;
}

export default function SPCVariabilityChart({
  data,
  yField,
  startDate,
  endDate,
  yScale,
  width = 400,
  height = 500,
}: SPCVariabilityChartProps) {
  // Filter data by date range only (NOT by entity - show all entities)
  const filteredData = useMemo(() => {
    if (!startDate && !endDate) {
      return data;
    }

    return data.filter((item) => {
      const itemDate = new Date(item.date_process);
      
      let isInDateRange = true;
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        isInDateRange = isInDateRange && itemDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        isInDateRange = isInDateRange && itemDate <= end;
      }
      
      return isInDateRange;
    });
  }, [data, startDate, endDate]);

  // Sort entities alphabetically for consistent display
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      return a.entity.localeCompare(b.entity);
    });
  }, [filteredData]);

  return (
    <VariabilityChart<CDDataItem>
      data={sortedData}
      yField={yField}
      groupField="entity"
      yScale={yScale}
      width={width}
      height={height}
      outlierThreshold={1.5} // 1.5 × IQR threshold for outliers (red highlighting)
      margin={{ top: 20, right: 40, bottom: 60, left: 70 }}
    />
  );
}