'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { CDDataItem } from '@/services/cdDataService';
import { getNumericExtent } from '@/lib/charts/scales';

export function useSharedYScale(
  timelineData: CDDataItem[],
  variabilityData: CDDataItem[],
  yField: keyof CDDataItem,
  height: number = 450
) {
  return useMemo(() => {
    // Combine both datasets to calculate shared extent
    const combinedData = [...timelineData, ...variabilityData];
    
    if (combinedData.length === 0) {
      return d3.scaleLinear().domain([0, 1]).range([height, 0]);
    }

    // Calculate combined extent from both datasets
    const [min, max] = getNumericExtent(combinedData, yField);
    
    // Add some padding to the domain (5% on each side)
    const padding = (max - min) * 0.05;
    const domain = [min - padding, max + padding];
    
    // Create shared linear scale
    return d3.scaleLinear()
      .domain(domain)
      .range([height, 0])
      .nice(); // Round to nice values
  }, [timelineData, variabilityData, yField, height]);
}