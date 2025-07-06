// Generic SPC data types and configurations

export interface SPCDataItem {
  id: number;
  entity: string;
  lot: string;
  date_process: string;
  date_read: string;
  spc_monitor_name: string;
  process_type: string;
  product_type: string;
  duration_subseq_process_step: number;
  fake_property1: string;
  fake_property2: string;
}

export interface MetricConfig {
  key: string;
  label: string;
  format?: (value: number) => string;
  precision?: number;
  unit?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface SPCDataSetConfig {
  name: string;
  spcMonitor: string;
  metrics: MetricConfig[];
  columns: ColumnConfig[];
  apiEndpoints: {
    data: string;
    stats: string;
    entities: string;
    limits: string;
  };
}

export interface Statistics {
  [key: string]: {
    mean: number;
    median: number;
    std_dev: number;
    min: number;
    max: number;
  };
}

export interface FilterParams {
  entities?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DataResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProcessProductCombination {
  process_type: string;
  product_type: string;
}