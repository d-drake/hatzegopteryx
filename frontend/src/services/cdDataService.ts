import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CDDataItem {
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

export interface CDDataFilters {
  entity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  process_type?: string;
  product_type?: string;
  spc_monitor_name?: string;
}

export interface CDDataStats {
  count: number;
  avg_cd_att: number;
  avg_bias: number;
  min_cd_att: number;
  max_cd_att: number;
  min_bias: number;
  max_bias: number;
}

export async function fetchCDData(filters?: CDDataFilters): Promise<CDDataItem[]> {
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.process_type) params.append('process_type', filters.process_type);
      if (filters.product_type) params.append('product_type', filters.product_type);
      if (filters.spc_monitor_name) params.append('spc_monitor_name', filters.spc_monitor_name);
    }

    const response = await axios.get<CDDataItem[]>(`${API_URL}/api/cd-data/`, {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching CD data:', error);
    throw error;
  }
}

export async function fetchCDDataStats(filters?: CDDataFilters): Promise<CDDataStats> {
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.process_type) params.append('process_type', filters.process_type);
      if (filters.product_type) params.append('product_type', filters.product_type);
      if (filters.spc_monitor_name) params.append('spc_monitor_name', filters.spc_monitor_name);
    }

    const response = await axios.get<CDDataStats>(`${API_URL}/api/cd-data/stats`, {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching CD data stats:', error);
    throw error;
  }
}

export async function fetchEntities(): Promise<string[]> {
  try {
    const response = await axios.get<string[]>(`${API_URL}/api/cd-data/entities`);
    return response.data;
  } catch (error) {
    console.error('Error fetching entities:', error);
    throw error;
  }
}

export async function fetchProcessTypes(): Promise<string[]> {
  try {
    const response = await axios.get<string[]>(`${API_URL}/api/cd-data/process-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching process types:', error);
    throw error;
  }
}

export async function fetchProductTypes(): Promise<string[]> {
  try {
    const response = await axios.get<string[]>(`${API_URL}/api/cd-data/product-types`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product types:', error);
    throw error;
  }
}

export async function fetchSPCMonitorNames(): Promise<string[]> {
  try {
    const response = await axios.get<string[]>(`${API_URL}/api/cd-data/spc-monitor-names`);
    return response.data;
  } catch (error) {
    console.error('Error fetching SPC monitor names:', error);
    throw error;
  }
}

export interface ProcessProductCombination {
  process_type: string;
  product_type: string;
}

export async function fetchProcessProductCombinations(): Promise<ProcessProductCombination[]> {
  try {
    const response = await axios.get<ProcessProductCombination[]>(`${API_URL}/api/cd-data/process-product-combinations`);
    return response.data;
  } catch (error) {
    console.error('Error fetching process-product combinations:', error);
    throw error;
  }
}