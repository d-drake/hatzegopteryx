import { ISPCDataService } from "./ISPCDataService";
import {
  SPCRegL1,
  Statistics,
  FilterParams,
  DataResponse,
  MetricConfig,
  ColumnConfig,
  SPCLimits,
  ProcessProductCombination,
} from "@/types";
import apiClient from "@/lib/axios";
import { retryRequest } from "./utils";

export class SPCRegL1DataService implements ISPCDataService<SPCRegL1> {
  private apiBasePath = "/api/spc-reg-l1";

  getApiBasePath(): string {
    return this.apiBasePath;
  }

  async fetchData(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
    filterParams?: FilterParams;
  }): Promise<DataResponse<SPCRegL1>> {
    return retryRequest(async () => {
      const queryParams = new URLSearchParams();

      queryParams.append("spc_monitor_name", params.spcMonitor);
      queryParams.append("process_type", params.processType);
      queryParams.append("product_type", params.productType);

      if (params.filterParams) {
        const {
          entities,
          startDate,
          endDate,
          page,
          pageSize,
          sortBy,
          sortOrder,
        } = params.filterParams;

        if (entities && entities.length > 0) {
          entities.forEach((entity) => queryParams.append("entity", entity));
        }
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
        if (page !== undefined)
          queryParams.append(
            "skip",
            ((page - 1) * (pageSize || 100)).toString(),
          );
        if (pageSize) queryParams.append("limit", pageSize.toString());
        if (sortBy) queryParams.append("sort_by", sortBy);
        if (sortOrder) queryParams.append("sort_order", sortOrder);
      }

      const response = await apiClient.get<SPCRegL1[]>(`${this.apiBasePath}/`, {
        params: queryParams,
      });

      // Transform backend response to match DataResponse interface
      // Backend returns array directly, not wrapped in object
      return {
        data: response.data || [],
        total: response.data?.length || 0,
        page: params.filterParams?.page || 1,
        pageSize: params.filterParams?.pageSize || 100,
      };
    });
  }

  async fetchStatistics(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
    entities?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<Statistics> {
    return retryRequest(async () => {
      const queryParams = new URLSearchParams();

      queryParams.append("spc_monitor_name", params.spcMonitor);
      queryParams.append("process_type", params.processType);
      queryParams.append("product_type", params.productType);

      if (params.entities && params.entities.length > 0) {
        params.entities.forEach((entity) =>
          queryParams.append("entity", entity),
        );
      }
      if (params.startDate) queryParams.append("start_date", params.startDate);
      if (params.endDate) queryParams.append("end_date", params.endDate);

      const response = await apiClient.get<any>(`${this.apiBasePath}/stats`, {
        params: queryParams,
      });

      // Transform backend stats to match Statistics interface
      const stats = response.data;
      return {
        registration: {
          mean: stats.registration_mean || 0,
          median: stats.registration_median || 0,
          std_dev: stats.registration_std_dev || 0,
          min: stats.registration_min || 0,
          max: stats.registration_max || 0,
        },
        reg_x: {
          mean: stats.scale_x_mean || 0,
          median: stats.scale_x_median || 0,
          std_dev: stats.scale_x_std_dev || 0,
          min: stats.scale_x_min || 0,
          max: stats.scale_x_max || 0,
        },
        reg_y: {
          mean: stats.scale_y_mean || 0,
          median: stats.scale_y_median || 0,
          std_dev: stats.scale_y_std_dev || 0,
          min: stats.scale_y_min || 0,
          max: stats.scale_y_max || 0,
        },
        ortho: {
          mean: stats.ortho_mean || 0,
          median: stats.ortho_median || 0,
          std_dev: stats.ortho_std_dev || 0,
          min: stats.ortho_min || 0,
          max: stats.ortho_max || 0,
        },
      };
    });
  }

  async getEntities(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
  }): Promise<string[]> {
    return retryRequest(async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("spc_monitor_name", params.spcMonitor);
      queryParams.append("process_type", params.processType);
      queryParams.append("product_type", params.productType);

      const response = await apiClient.get<string[]>(
        `${this.apiBasePath}/entities`,
        {
          params: queryParams,
        },
      );
      return response.data;
    });
  }

  async getSPCLimits(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
  }): Promise<SPCLimits[]> {
    return retryRequest(async () => {
      const queryParams = new URLSearchParams();
      queryParams.append("spc_monitor_name", params.spcMonitor);
      queryParams.append("process_type", params.processType);
      queryParams.append("product_type", params.productType);

      const response = await apiClient.get<SPCLimits[]>(
        `${this.apiBasePath}/spc-limits`,
        {
          params: queryParams,
        },
      );
      return response.data;
    });
  }

  getMetricConfig(): MetricConfig[] {
    // Import from configuration
    const { loadSPCConfig } = require("@/lib/spc-dashboard/config/loader");
    const config = loadSPCConfig("SPC_REG_L1");
    if (!config) return [];

    const statisticMetrics = config.analytics.statisticMetrics;

    return statisticMetrics.map((metricKey: string) => {
      const metric = config.metrics[metricKey];
      return {
        key: metric.key,
        label: metric.label,
        precision: metric.precision,
        unit: metric.unit,
      };
    });
  }

  getColumnConfig(): ColumnConfig[] {
    // Import from configuration
    const { loadSPCConfig } = require("@/lib/spc-dashboard/config/loader");
    const config = loadSPCConfig("SPC_REG_L1");
    if (!config) return [];

    const tableColumns = config.analytics.tableColumns;

    return tableColumns.map((col: any) => {
      const columnConfig: ColumnConfig = {
        key: col.key,
        label: col.label,
        sortable: col.sortable ?? true,
        align: col.align || "left",
      };

      // Add format function based on column properties
      if (col.format === "datetime") {
        columnConfig.format = (value: string) =>
          new Date(value).toLocaleString();
      } else if (col.precision !== undefined) {
        columnConfig.format = (value: number) => {
          const formatted = value.toFixed(col.precision);
          return col.unit ? `${formatted} ${col.unit}` : formatted;
        };
      } else if (col.unit) {
        columnConfig.format = (value: number) => `${value}${col.unit}`;
      }

      return columnConfig;
    });
  }

  async fetchProcessProductCombinations(): Promise<
    ProcessProductCombination[]
  > {
    return retryRequest(async () => {
      const response = await apiClient.get<ProcessProductCombination[]>(
        `${this.apiBasePath}/process-product-combinations`,
      );
      return response.data;
    });
  }
}
