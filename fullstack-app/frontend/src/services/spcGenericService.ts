import apiClient from '@/lib/axios';
import { getSPCDataSourceConfig } from '@/lib/spc-dashboard/spcDataSourceRegistry';

/**
 * Generic service for SPC data source operations using the registry pattern
 */
export class SPCGenericService {
  constructor(private spcMonitor: string) {}

  /**
   * Fetch entities for the current SPC monitor
   */
  async fetchEntities(): Promise<string[]> {
    const config = getSPCDataSourceConfig(this.spcMonitor);
    
    if (!config.apiEndpoints.entities) {
      throw new Error(`Entity endpoint not configured for ${this.spcMonitor}`);
    }

    try {
      const response = await apiClient.get<string[]>(config.apiEndpoints.entities);
      return response.data;
    } catch (error) {
      console.error(`Error fetching entities for ${this.spcMonitor}:`, error);
      throw error;
    }
  }

  /**
   * Fetch process types for the current SPC monitor
   */
  async fetchProcessTypes(): Promise<string[]> {
    const config = getSPCDataSourceConfig(this.spcMonitor);
    
    try {
      const response = await apiClient.get<string[]>(config.apiEndpoints.processTypes);
      return response.data;
    } catch (error) {
      console.error(`Error fetching process types for ${this.spcMonitor}:`, error);
      throw error;
    }
  }

  /**
   * Fetch product types for the current SPC monitor
   */
  async fetchProductTypes(): Promise<string[]> {
    const config = getSPCDataSourceConfig(this.spcMonitor);
    
    try {
      const response = await apiClient.get<string[]>(config.apiEndpoints.productTypes);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product types for ${this.spcMonitor}:`, error);
      throw error;
    }
  }

  /**
   * Check if this SPC monitor supports entity filtering
   */
  supportsEntityFiltering(): boolean {
    const config = getSPCDataSourceConfig(this.spcMonitor);
    return config.dataFields.hasEntityField && !!config.apiEndpoints.entities;
  }
}

/**
 * Create a service instance for a specific SPC monitor
 */
export function createSPCService(spcMonitor: string): SPCGenericService {
  return new SPCGenericService(spcMonitor);
}