import { useMemo } from 'react';
import * as d3 from 'd3';

export interface BoxPlotData {
  entity: string;
  values: number[];
  q1: number;
  median: number;
  q3: number;
  mean: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliers: number[];
  minNonOutlier: number;
  maxNonOutlier: number;
}

interface DataPoint {
  [key: string]: any;
}

/**
 * Custom hook to calculate box plot statistics for variability charts
 * @param data - Array of data points
 * @param categoricalColumn - Column name for grouping categories
 * @param valueColumn - Column name for numeric values
 * @returns Sorted array of box plot data for each category
 */
export function useBoxPlotStatistics(
  data: DataPoint[],
  categoricalColumn: string,
  valueColumn: string
): BoxPlotData[] {
  return useMemo(() => {
    const grouped = d3.group(data, d => d[categoricalColumn]);
    const boxPlots: BoxPlotData[] = [];

    grouped.forEach((values, category) => {
      const numericValues = values
        .map(d => d[valueColumn])
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b);

      if (numericValues.length === 0) return;

      const q1 = d3.quantile(numericValues, 0.25) || 0;
      const median = d3.quantile(numericValues, 0.5) || 0;
      const q3 = d3.quantile(numericValues, 0.75) || 0;
      const iqr = q3 - q1;
      const mean = d3.mean(numericValues) || 0;

      const lowerWhisker = q1 - 1.5 * iqr;
      const upperWhisker = q3 + 1.5 * iqr;

      const outliers = numericValues.filter(v => v < lowerWhisker || v > upperWhisker);
      const nonOutliers = numericValues.filter(v => v >= lowerWhisker && v <= upperWhisker);

      boxPlots.push({
        entity: String(category),
        values: numericValues,
        q1,
        median,
        q3,
        mean,
        iqr,
        lowerWhisker,
        upperWhisker,
        outliers,
        minNonOutlier: nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1,
        maxNonOutlier: nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3,
      });
    });

    return boxPlots.sort((a, b) => a.entity.localeCompare(b.entity));
  }, [data, categoricalColumn, valueColumn]);
}