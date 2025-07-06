import { ISPCDataService } from './ISPCDataService';
import { 
  SPCRegL1, 
  Statistics, 
  FilterParams, 
  DataResponse,
  MetricConfig,
  ColumnConfig,
  SPCLimits 
} from '@/types';
import apiClient from '@/lib/axios';
import { retryRequest } from './utils';

export class SPCRegL1DataService implements ISPCDataService<SPCRegL1> {
  private apiBasePath = '/api/spc-reg-l1';

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

      const response = await apiClient.get<SPCRegL1[]>(`${this.apiBasePath}/`, {
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
        registration: {
          mean: stats.registration_mean || 0,
          median: stats.registration_median || 0,
          std_dev: stats.registration_std_dev || 0,
          min: stats.registration_min || 0,
          max: stats.registration_max || 0
        },
        reg_x: {
          mean: stats.scale_x_mean || 0,
          median: stats.scale_x_median || 0,
          std_dev: stats.scale_x_std_dev || 0,
          min: stats.scale_x_min || 0,
          max: stats.scale_x_max || 0
        },
        reg_y: {
          mean: stats.scale_y_mean || 0,
          median: stats.scale_y_median || 0,
          std_dev: stats.scale_y_std_dev || 0,
          min: stats.scale_y_min || 0,
          max: stats.scale_y_max || 0
        },
        ortho: {
          mean: stats.ortho_mean || 0,
          median: stats.ortho_median || 0,
          std_dev: stats.ortho_std_dev || 0,
          min: stats.ortho_min || 0,
          max: stats.ortho_max || 0
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
        key: 'registration',
        label: 'Registration',
        precision: 3,
        unit: 'nm'
      },
      {
        key: 'reg_x',
        label: 'Scale X',
        precision: 3,
        unit: 'ppm'
      },
      {
        key: 'reg_y',
        label: 'Scale Y',
        precision: 3,
        unit: 'ppm'
      },
      {
        key: 'ortho',
        label: 'Orthogonality',
        precision: 4,
        unit: 'μrad'
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
        key: 'registration',
        label: 'Registration',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(3) + ' nm'
      },
      {
        key: 'reg_x',
        label: 'Reg X',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(3) + ' ppm'
      },
      {
        key: 'reg_y',
        label: 'Reg Y',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(3) + ' ppm'
      },
      {
        key: 'field_x',
        label: 'Field X',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(3)
      },
      {
        key: 'field_y',
        label: 'Field Y',
        sortable: true,
        align: 'right',
        format: (value: number) => value.toFixed(3)
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