/**
 * Unit registry for SPC dashboard components
 * Provides unit mappings for different SPC monitor types
 */

import { UnitMapping } from "@/lib/formatters/fieldFormatter";

/**
 * Units for SPC CD L1 monitor type
 */
export enum SpcCDL1Units {
  cd_att = "nm",
  cd_x_y = "nm",
  duration_subseq_process_step = "s",
}

/**
 * Units for SPC REG L1 monitor type
 */
export enum SpcRegL1Units {
  scale_x = "ppt",
  scale_y = "ppt",
  ortho = "mRad",
  centrality_x = "mm",
  centrality_y = "mm",
  centrality_rotation = "mRad",
}

/**
 * Get appropriate unit mapping for a given SPC monitor name
 * @param spcMonitorName - The monitor name (e.g., "SPC_CD_L1", "SPC_REG_L1")
 * @returns Unit mapping object for the specified monitor type
 */
export function getUnitsForMonitor(spcMonitorName: string): UnitMapping {
  const monitorKey = spcMonitorName.toLowerCase();

  switch (monitorKey) {
    case "spc_cd_l1":
      return SpcCDL1Units;
    case "spc_reg_l1":
      return SpcRegL1Units;
    default:
      // Return empty object for unknown monitor types
      return {};
  }
}

/**
 * Get all available monitor types
 * @returns Array of supported monitor type keys
 */
export function getSupportedMonitorTypes(): string[] {
  return ["spc_cd_l1", "spc_reg_l1"];
}

/**
 * Check if a monitor type is supported
 * @param spcMonitorName - The monitor name to check
 * @returns True if the monitor type is supported, false otherwise
 */
export function isMonitorTypeSupported(spcMonitorName: string): boolean {
  const monitorKey = spcMonitorName.toLowerCase();
  return getSupportedMonitorTypes().includes(monitorKey);
}
