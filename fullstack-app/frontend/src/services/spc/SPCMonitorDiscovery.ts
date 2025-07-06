import { SPCDataServiceFactory } from "./SPCDataServiceFactory";
import { ProcessProductCombination } from "@/types";

export interface SPCMonitorData {
  monitors: string[];
  processProductCombinations: ProcessProductCombination[];
}

/**
 * Service for discovering available SPC monitors and their process-product combinations
 */
export class SPCMonitorDiscovery {
  /**
   * Gets monitors that have metric configuration files
   */
  static getConfiguredMonitors(): string[] {
    const allMonitors = SPCDataServiceFactory.getSupportedMonitors();
    const configuredMonitors: string[] = [];

    // Check which monitors have corresponding metric configuration files
    for (const monitor of allMonitors) {
      try {
        // Check if configuration exists in the loader
        const {
          hasMonitorConfig,
        } = require("@/lib/spc-dashboard/config/loader");
        if (hasMonitorConfig(monitor)) {
          configuredMonitors.push(monitor);
        } else {
          console.warn(`No metric configuration found for ${monitor}`);
        }
      } catch (error) {
        // Config file doesn't exist for this monitor
        console.warn(`No metric configuration found for ${monitor}:`, error);
      }
    }

    return configuredMonitors;
  }

  /**
   * Fetches all available SPC monitors and their process-product combinations
   */
  static async fetchAllMonitorData(): Promise<SPCMonitorData> {
    const supportedMonitors = this.getConfiguredMonitors();
    const processProductMap = new Map<string, ProcessProductCombination>();

    // Fetch process-product combinations from all unique service types
    const uniqueServices = new Map<string, any>();

    for (const monitor of supportedMonitors) {
      const dataType = SPCDataServiceFactory.getDataType(monitor);
      if (!uniqueServices.has(dataType)) {
        const service = SPCDataServiceFactory.create(monitor);
        uniqueServices.set(dataType, service);
      }
    }

    // Fetch process-product combinations from each unique service
    const fetchPromises = Array.from(uniqueServices.values()).map(
      async (service) => {
        try {
          const combinations = await service.fetchProcessProductCombinations();
          return combinations;
        } catch (error) {
          console.error("Error fetching process-product combinations:", error);
          return [];
        }
      },
    );

    const results = await Promise.all(fetchPromises);

    // Merge all process-product combinations
    for (const combinations of results) {
      for (const combo of combinations) {
        const key = `${combo.process_type}-${combo.product_type}`;
        processProductMap.set(key, combo);
      }
    }

    return {
      monitors: supportedMonitors,
      processProductCombinations: Array.from(processProductMap.values()),
    };
  }

  /**
   * Fetches process-product combinations for a specific monitor
   */
  static async fetchMonitorProcessProducts(
    spcMonitor: string,
  ): Promise<ProcessProductCombination[]> {
    try {
      const service = SPCDataServiceFactory.create(spcMonitor);
      return await service.fetchProcessProductCombinations();
    } catch (error) {
      console.error(
        `Error fetching process-product combinations for ${spcMonitor}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Gets all supported monitor names that have metric configurations
   */
  static getSupportedMonitors(): string[] {
    return this.getConfiguredMonitors();
  }
}
