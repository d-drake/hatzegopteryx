import { SPCMonitorDiscovery } from "@/services/spc/SPCMonitorDiscovery";
import { SPCDataServiceFactory } from "@/services/spc/SPCDataServiceFactory";

/**
 * Gets the default SPC route based on the first available monitor and process/product combination
 */
export async function getDefaultSPCRoute(
  basePath: "/spc-dashboard" | "/spc-analytics"
): Promise<string> {
  try {
    // Get configured monitors
    const monitors = SPCMonitorDiscovery.getConfiguredMonitors();
    if (monitors.length === 0) {
      // Fallback to hardcoded default if no monitors configured
      return `${basePath}/SPC_CD_L1/1000-BNT44`;
    }

    // Use the first available monitor
    const firstMonitor = monitors[0];

    // Try to get process/product combinations for the first monitor
    try {
      const service = SPCDataServiceFactory.create(firstMonitor);
      const combinations = await service.fetchProcessProductCombinations();

      if (combinations.length > 0) {
        // Use the first available combination
        const firstCombo = combinations[0];
        return `${basePath}/${firstMonitor}/${firstCombo.process_type}-${firstCombo.product_type}`;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch combinations for ${firstMonitor}, using fallback`,
        error
      );
    }

    // Fallback to a default combination if fetching fails
    return `${basePath}/${firstMonitor}/1000-BNT44`;
  } catch (error) {
    console.error("Error determining default SPC route:", error);
    // Ultimate fallback
    return `${basePath}/SPC_CD_L1/1000-BNT44`;
  }
}

/**
 * Gets default routes synchronously using the first configured monitor
 * This is useful for initial render when async operations aren't possible
 */
export function getDefaultSPCRouteSync(
  basePath: "/spc-dashboard" | "/spc-analytics"
): string {
  try {
    const monitors = SPCMonitorDiscovery.getConfiguredMonitors();
    if (monitors.length > 0) {
      // For sync version, we can't fetch combinations, so use a reasonable default
      return `${basePath}/${monitors[0]}/1000-BNT44`;
    }
  } catch (error) {
    console.warn("Error getting configured monitors:", error);
  }

  // Fallback
  return `${basePath}/SPC_CD_L1/1000-BNT44`;
}