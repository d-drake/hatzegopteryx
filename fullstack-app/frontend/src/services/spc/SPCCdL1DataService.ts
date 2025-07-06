import { ISPCDataService } from './ISPCDataService';
import { 
  SPCCdL1, 
  Statistics, 
  FilterParams, 
  DataResponse,
  MetricConfig,
  ColumnConfig,
  SPCLimits 
} from '@/types';
import apiClient from '@/lib/axios';
import { retryRequest } from './utils';

export class SPCCdL1DataService implements ISPCDataService<SPCCdL1> {
  private apiBasePath = '/api/spc-cd-l1';

  getApiBasePath(): string {
    return this.apiBasePath;
  }

  async fetchData(params: {
    spcMonitor: string;
    processType: string;
    productType: string;
    filterParams?: FilterParams;
  }): Promise<DataResponse<SPCCdL1>> {
    return retryRequest(async () => {
      const queryParams = new URLSearchParams();
      
      queryParams.append('spc_monitor_name', params.spcMonitor);
      queryParams.append('process_type', params.processType);
      queryParams.append('product_type', params.productType);
      
      if (params.filterParams) {
        const { entities, startDate, endDate, page, pageSize, sortBy, sortOrder } = params.filterParams;
        
        if (entities && entities.length > 0) {
          entities.forEach(entity => queryParams.append('entity', entity));
        }
        if (startDate) queryParams.append('start_date', startDate);
        if (endDate) queryParams.append('end_date', endDate);
        if (page !== undefined) queryParams.append('skip', ((page - 1) * (pageSize || 100)).toString());
        if (pageSize) queryParams.append('limit', pageSize.toString());
        if (sortBy) queryParams.append('sort_by', sortBy);
        if (sortOrder) queryParams.append('sort_order', sortOrder);
      }

      const response = await apiClient.get<SPCCdL1[]>(`${this.apiBasePath}/`, {
        params: queryParams
      });
      
      // Transform backend response to match DataResponse interface
      // Backend returns array directly, not wrapped in object
      return {
        data: response.data || [],
        total: response.data?.length || 0,
        page: params.filterParams?.page || 1,
        pageSize: params.filterParams?.pageSize || 100
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
      
      queryParams.append('spc_monitor_name', params.spcMonitor);
      queryParams.append('process_type', params.processType);
      queryParams.append('product_type', params.productType);
      
      if (params.entities && params.entities.length > 0) {
        params.entities.forEach(entity => queryParams.append('entity', entity));
      }
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);

      const response = await apiClient.get<any>(`${this.apiBasePath}/stats`, {
        params: queryParams
      });
      
      // Transform backend stats to match Statistics interface
      const stats = response.data;
      return {
        cd_att: {
          mean: stats.cd_att_mean || 0,
          median: stats.cd_att_median || 0,
          std_dev: stats.cd_att_std_dev || 0,
          min: stats.cd_att_min || 0,
          max: stats.cd_att_max || 0
        },
        cd_x_y: {
          mean: stats.cd_x_y_mean || 0,
          median: stats.cd_x_y_median || 0,
          std_dev: stats.cd_x_y_std_dev || 0,
          min: stats.cd_x_y_min || 0,
          max: stats.cd_x_y_max || 0
        },
        cd_6sig: {
          mean: stats.cd_6sig_mean || 0,
          median: stats.cd_6sig_median || 0,
          std_dev: stats.cd_6sig_std_dev || 0,
          min: stats.cd_6sig_min || 0,
          max: stats.cd_6sig_max || 0
        }
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
      queryParams.append('spc_monitor_name', params.spcMonitor);
      queryParams.append('process_type', params.processType);
      queryParams.append('product_type', params.productType);

      const response = await apiClient.get<string[]>(`${this.apiBasePath}/entities`, {
        params: queryParams
      });
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
      queryParams.append('spc_monitor_name', params.spcMonitor);
      queryParams.append('process_type', params.processType);
      queryParams.append('product_type', params.productType);

      const response = await apiClient.get<SPCLimits[]>(`${this.apiBasePath}/spc-limits`, {
        params: queryParams
      });
      return response.data;
    });
  }

  getMetricConfig(): MetricConfig[] {
    return [
      {
        key: 'cd_att',
        label: 'CD ATT',
        precision: 2,
        unit: 'nm'
      },
      {
        key: 'cd_x_y',
        label: 'CD X-Y',
        precision: 2,
        unit: 'nm'
      },
      {
        key: 'cd_6sig',
        label: 'CD 6σ',
        precision: 2,
        unit: 'nm'
      }
    ];
  }

  getColumnConfig(): ColumnConfig[] {
    return [
      {
        key: 'entity',
        label: 'Entity',
        sortable: true,
        align: 'left'
      },
      {
        key: 'lot',
        label: 'Lot',
        sortable: true,
        align: 'left'
      },
      {
        key: 'date_process',
        label: 'Process Date',
        sortable: true,
        align: 'left',
        format: (value: string) => new Date(value).toLocaleString()
      },
      {
        key: 'bias',
        label: 'Bias',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(2)
      },
      {
        key: 'bias_x_y',
        label: 'Bias X-Y',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(2)
      },
      {
        key: 'cd_att',
        label: 'CD ATT',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(2) + ' nm'
      },
      {
        key: 'cd_x_y',
        label: 'CD X-Y',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(2) + ' nm'
      },
      {
        key: 'cd_6sig',
        label: 'CD 6σ',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(2) + ' nm'
      },
      {
        key: 'duration_subseq_process_step',
        label: 'Duration',
        sortable: true,
        align: 'right',
        format: (value: number) => `${value}s`
      }
    ];
  }
}