import {
  SPCDataItem,
  Statistics,
  FilterParams,
  DataResponse,
  MetricConfig,
  ColumnConfig,
  ProcessProductCombination,
  SPCLimits,
} from "@/types";

export interface ISPCDataService<T extends SPCDataItem> {
  // Fetch paginated data
  fetchData(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
    filterParams?: FilterParams;
  }): Promise<DataResponse<T>>;

  // Fetch statistics
  fetchStatistics(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
    entities?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<Statistics>;

  // Get available entities
  getEntities(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
  }): Promise<string[]>;

  // Get SPC limits
  getSPCLimits(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
  }): Promise<SPCLimits[]>;

  // Get metric configuration
  getMetricConfig(): MetricConfig[];

  // Get column configuration for data table
  getColumnConfig(): ColumnConfig[];

  // Get API base path
  getApiBasePath(): string;

  // Fetch available process-product combinations
  fetchProcessProductCombinations(): Promise<ProcessProductCombination[]>;
}
