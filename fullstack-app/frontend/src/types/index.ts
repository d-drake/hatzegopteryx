export interface Item {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateItem {
  title: string;
  description?: string;
  completed?: boolean;
}

export interface UpdateItem {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface CDData {
  lot: string;
  date_process: string;
  bias: number;
  bias_x_y: number;
  cd_att: number;
  cd_x_y: number;
  cd_6sig: number;
  duration_subseq_process_step: number;  // Duration in seconds (1500-2200s)
  entity: string;
  fake_property1: string;
  fake_property2: string;
  process_type: string;
  product_type: string;
  spc_monitor_name: string;
}

export interface CDDataStats {
  total_count: number;
  avg_cd_att: number;
  min_cd_att: number;
  max_cd_att: number;
  avg_cd_6sig: number;
  entity_count?: number;
}

export interface SPCLimits {
  id: number;
  process_type: string;
  product_type: string;
  spc_monitor_name: string;
  spc_chart_name: string;
  cl?: number;
  lcl?: number;
  ucl?: number;
  effective_date: string;
}

export interface SPCLimitsCreate {
  process_type: string;
  product_type: string;
  spc_monitor_name: string;
  spc_chart_name: string;
  cl?: number;
  lcl?: number;
  ucl?: number;
}