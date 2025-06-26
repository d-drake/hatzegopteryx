import * as d3 from 'd3';

export interface BoxPlotStats {
  q1: number;
  median: number;
  q3: number;
  whiskerMin: number;
  whiskerMax: number;
  outliers: number[];
  iqr: number;
  mean?: number;
  standardDeviation?: number;
}

/**
 * Calculate box plot statistics using proper quartile calculation methods
 * @param values Array of numeric values
 * @param outlierThreshold IQR multiplier for outlier detection (default 1.5)
 * @returns BoxPlotStats object with all statistical measures
 */
export const calculateBoxPlotStats = (values: number[], outlierThreshold = 1.5): BoxPlotStats => {
  if (values.length === 0) {
    return {
      q1: 0,
      median: 0,
      q3: 0,
      whiskerMin: 0,
      whiskerMax: 0,
      outliers: [],
      iqr: 0,
      mean: 0,
      standardDeviation: 0,
    };
  }

  // Sort values for quartile calculation
  const sortedValues = [...values].sort((a, b) => a - b);
  const n = sortedValues.length;

  // Calculate quartiles using the median-of-medians method
  const median = d3.median(sortedValues) || 0;
  
  // Split data for Q1 and Q3 calculation
  const lowerHalf = sortedValues.slice(0, Math.floor(n / 2));
  const upperHalf = sortedValues.slice(Math.ceil(n / 2));
  
  const q1 = d3.median(lowerHalf) || sortedValues[0];
  const q3 = d3.median(upperHalf) || sortedValues[n - 1];
  
  // Interquartile range
  const iqr = q3 - q1;
  
  // Calculate outlier boundaries
  const lowerBound = q1 - outlierThreshold * iqr;
  const upperBound = q3 + outlierThreshold * iqr;
  
  // Identify outliers and non-outliers
  const outliers: number[] = [];
  const nonOutliers: number[] = [];
  
  sortedValues.forEach(value => {
    if (value < lowerBound || value > upperBound) {
      outliers.push(value);
    } else {
      nonOutliers.push(value);
    }
  });
  
  // Calculate whiskers as min/max of non-outlier values
  const whiskerMin = nonOutliers.length > 0 ? Math.min(...nonOutliers) : sortedValues[0];
  const whiskerMax = nonOutliers.length > 0 ? Math.max(...nonOutliers) : sortedValues[n - 1];
  
  // Calculate mean and standard deviation
  const mean = d3.mean(values) || 0;
  const variance = d3.variance(values) || 0;
  const standardDeviation = Math.sqrt(variance);

  return {
    q1,
    median,
    q3,
    whiskerMin,
    whiskerMax,
    outliers,
    iqr,
    mean,
    standardDeviation,
  };
};

/**
 * Process data for box plot visualization by grouping and calculating statistics
 * @param data Array of data objects
 * @param yField Field name for values
 * @param groupField Field name for grouping (e.g., 'entity')
 * @param outlierThreshold IQR multiplier for outlier detection
 * @returns Object with grouped statistics and entity ordering
 */
export const processDataForBoxPlots = <T extends Record<string, any>>(
  data: T[],
  yField: keyof T,
  groupField: keyof T,
  outlierThreshold = 1.5
) => {
  // Group data by entity
  const groupedData = new Map<string, number[]>();
  
  data.forEach(d => {
    const groupValue = String(d[groupField]);
    const yValue = Number(d[yField]);
    
    if (!isNaN(yValue)) {
      if (!groupedData.has(groupValue)) {
        groupedData.set(groupValue, []);
      }
      groupedData.get(groupValue)!.push(yValue);
    }
  });
  
  // Sort entities alphabetically
  const entityNames = Array.from(groupedData.keys()).sort();
  
  // Calculate statistics for each entity
  const boxPlotData = entityNames.map(entityName => {
    const values = groupedData.get(entityName) || [];
    const stats = calculateBoxPlotStats(values, outlierThreshold);
    
    return {
      entity: entityName,
      values,
      stats,
      count: values.length,
    };
  });
  
  return {
    boxPlotData,
    entityNames,
    allValues: Array.from(groupedData.values()).flat(),
  };
};

/**
 * Format statistics for tooltip display
 * @param stats BoxPlotStats object
 * @param entity Entity name
 * @param count Number of data points
 * @returns Formatted HTML string for tooltip
 */
export const formatBoxPlotTooltip = (stats: BoxPlotStats, entity: string, count: number): string => {
  const parts = [
    `<strong>Entity:</strong> ${entity}`,
    `<strong>Count:</strong> ${count}`,
    `<strong>Median:</strong> ${stats.median.toFixed(2)}`,
    `<strong>Q1:</strong> ${stats.q1.toFixed(2)}`,
    `<strong>Q3:</strong> ${stats.q3.toFixed(2)}`,
    `<strong>IQR:</strong> ${stats.iqr.toFixed(2)}`,
  ];
  
  if (stats.mean !== undefined) {
    parts.push(`<strong>Mean:</strong> ${stats.mean.toFixed(2)}`);
  }
  
  if (stats.standardDeviation !== undefined) {
    parts.push(`<strong>Std Dev:</strong> ${stats.standardDeviation.toFixed(2)}`);
  }
  
  if (stats.outliers.length > 0) {
    parts.push(`<strong>Outliers:</strong> ${stats.outliers.length}`);
  }
  
  return parts.join('<br/>');
};