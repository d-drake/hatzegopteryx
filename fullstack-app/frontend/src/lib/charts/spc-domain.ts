import { SPCLimits } from "../../types";

export interface SPCDomainOptions {
  /** Original data extent [min, max] */
  dataExtent: [number, number];
  /** SPC limits for the current chart */
  spcLimits?: SPCLimits;
  /** Standard deviation across all entities for fallback calculations */
  allEntityStdDev?: number;
  /** Chart field name (e.g., "cd_att", "cd_x_y") */
  chartName: string;
}

/**
 * Calculate Y-axis domain using SPC-aware rules:
 * 1. If UCL exists: yMax = CL + abs(UCL-CL)*2
 * 2. If no UCL: yMax = CL + abs(STD_ALL_ENTITIES)*4
 * 3. If LCL exists: yMin = CL - abs(LCL-CL)*2
 * 4. If no LCL: yMin = CL - abs(STD_ALL_ENTITIES)*4
 * 
 * Falls back to data extent if SPC limits or standard deviation unavailable.
 */
export function calculateSPCDomain(options: SPCDomainOptions): [number, number] {
  const { dataExtent, spcLimits, allEntityStdDev, chartName } = options;

  // Fallback to data extent if no SPC limits available
  if (!spcLimits || spcLimits.cl === undefined) {
    return dataExtent;
  }

  const { cl, lcl, ucl } = spcLimits;
  const centerLine = cl;

  // Calculate yMax using SPC rules
  let yMax: number;
  if (ucl !== undefined) {
    // Rule 1: If UCL exists, yMax = CL + abs(UCL-CL)*2
    const uclDistance = Math.abs(ucl - centerLine);
    yMax = centerLine + (uclDistance * 2);
  } else if (allEntityStdDev !== undefined) {
    // Rule 2: If no UCL, yMax = CL + abs(STD_ALL_ENTITIES)*4
    yMax = centerLine + (Math.abs(allEntityStdDev) * 4);
  } else {
    // Fallback to data extent
    yMax = dataExtent[1];
  }

  // Calculate yMin using SPC rules
  let yMin: number;
  if (lcl !== undefined) {
    // Rule 3: If LCL exists, yMin = CL - abs(LCL-CL)*2
    const lclDistance = Math.abs(lcl - centerLine);
    yMin = centerLine - (lclDistance * 2);
  } else if (allEntityStdDev !== undefined) {
    // Rule 4: If no LCL, yMin = CL - abs(STD_ALL_ENTITIES)*4
    yMin = centerLine - (Math.abs(allEntityStdDev) * 4);
  } else {
    // Fallback to data extent
    yMin = dataExtent[0];
  }

  // Ensure the calculated domain includes the original data extent
  // This prevents data points from being clipped outside the SPC-calculated domain
  const finalYMin = Math.min(yMin, dataExtent[0]);
  const finalYMax = Math.max(yMax, dataExtent[1]);

  return [finalYMin, finalYMax];
}

/**
 * Calculate standard deviation across all entities for a specific field
 * Used for SPC domain calculation when UCL/LCL limits are not available
 */
export function calculateAllEntitiesStdDev(data: any[], field: string): number {
  // Extract all valid values for the field
  const values = data
    .map((item) => item[field])
    .filter((value) => value !== null && value !== undefined && !isNaN(value));

  if (values.length === 0) {
    return 0;
  }

  // Calculate mean
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  // Calculate population standard deviation
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return stdDev;
}

/**
 * Helper function to validate SPC domain results
 * Ensures the domain is valid and provides meaningful bounds
 */
export function validateSPCDomain(domain: [number, number], chartName: string): [number, number] {
  let [yMin, yMax] = domain;

  // Ensure yMax > yMin
  if (yMax <= yMin) {
    const center = (yMin + yMax) / 2;
    const padding = Math.max(Math.abs(center) * 0.1, 1); // 10% padding or minimum 1 unit
    yMin = center - padding;
    yMax = center + padding;
  }

  // Ensure reasonable bounds (not infinite or NaN)
  if (!isFinite(yMin) || !isFinite(yMax)) {
    console.warn(`Invalid SPC domain calculated for chart ${chartName}:`, domain);
    return [0, 1]; // Safe fallback
  }

  return [yMin, yMax];
}