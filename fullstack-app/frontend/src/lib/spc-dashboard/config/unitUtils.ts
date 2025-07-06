/**
 * Unit utilities that extract unit information from SPC metric configurations
 * Replaces the legacy unitRegistry.ts by using the new YAML-based metric system
 */

import { UnitMapping } from "@/lib/formatters/fieldFormatter";
import { getMetricsConfig, getTableColumns, hasMonitorConfig } from "./loader";

/**
 * Get appropriate unit mapping for a given SPC monitor name
 * Extracts unit information from the metric configuration system
 * @param spcMonitorName - The monitor name (e.g., "SPC_CD_L1", "SPC_REG_L1")
 * @returns Unit mapping object for the specified monitor type
 */
export function getUnitsForMonitor(spcMonitorName: string): UnitMapping {
  if (!spcMonitorName || !hasMonitorConfig(spcMonitorName)) {
    return {};
  }

  const unitMapping: UnitMapping = {};

  // Get unit information from metric definitions
  const metrics = getMetricsConfig(spcMonitorName);
  for (const metric of metrics) {
    if (metric.unit) {
      unitMapping[metric.key] = metric.unit;
    }
  }

  // Get additional unit information from table column configurations
  const columns = getTableColumns(spcMonitorName);
  for (const column of columns) {
    if (column.unit && !unitMapping[column.key]) {
      unitMapping[column.key] = column.unit;
    }
  }

  return unitMapping;
}

/**
 * Get all available monitor types that have configurations
 * @returns Array of supported monitor type keys
 */
export function getSupportedMonitorTypes(): string[] {
  // This could be expanded to dynamically discover available monitors
  // For now, return the known configured monitors
  return ["SPC_CD_L1", "SPC_REG_L1"];
}

/**
 * Check if a monitor type is supported
 * @param spcMonitorName - The monitor name to check
 * @returns True if the monitor type is supported, false otherwise
 */
export function isMonitorTypeSupported(spcMonitorName: string): boolean {
  return hasMonitorConfig(spcMonitorName);
}