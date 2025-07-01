import apiClient from '@/lib/axios';
import { AxiosError } from 'axios';

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.params) {
      console.log('Request params:', config.params);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors better
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    
    // Validate JSON response content
    if (response.headers['content-type']?.includes('application/json')) {
      try {
        // Check if response data is valid JSON by trying to stringify it
        JSON.stringify(response.data);
        console.log('Response data validation: ✅ Valid JSON');
      } catch (e) {
        console.error('Response data validation: ❌ Invalid JSON structure');
        console.error('Problematic response data:', response.data);
        throw new Error('Invalid JSON response from server');
      }
    }
    
    return response;
  },
  (error) => {
    // Enhanced error logging
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = error.config?.url || 'unknown';
    
    if (error.code === 'ECONNABORTED') {
      console.error(`❌ Request timeout: ${method} ${url}`);
    } else if (error.response?.status >= 500) {
      console.error(`❌ Server error: ${method} ${url} - Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (!error.response) {
      console.error(`❌ Network error: ${method} ${url} - ${error.message}`);
    } else {
      console.error(`❌ API Error: ${method} ${url} - Status: ${error.response.status}`);
      // Safely access response data
      if (error.response.data !== undefined) {
        console.error('Response data:', error.response.data);
      }
    }
    
    // Log the raw response if it's a JSON parsing issue
    if (error.message?.includes('JSON')) {
      console.error('Raw response that failed to parse:', error.response?.data);
      console.error('Response headers:', error.response?.headers);
      console.error('Response status:', error.response?.status);
      console.error('Response content-type:', error.response?.headers['content-type']);
      
      // Check if we got HTML instead of JSON (common in server errors)
      if (typeof error.response?.data === 'string' && error.response.data.includes('<html>')) {
        console.error('⚠️ Received HTML response instead of JSON - likely a server error page');
      }
    }
    
    return Promise.reject(error);
  }
);

// Retry helper function
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Only retry on network errors, timeouts, 5xx server errors, or JSON parsing errors
      const shouldRetry = error instanceof AxiosError && 
          (error.code === 'ECONNABORTED' || 
           !error.response || 
           error.response.status >= 500 ||
           error.message?.includes('JSON') ||
           error.message?.includes('Invalid JSON response'));
           
      if (shouldRetry) {
        console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}

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
  return retryRequest(async () => {
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

    const response = await apiClient.get<CDDataItem[]>('/api/cd-data/', {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  });
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

    const response = await apiClient.get<CDDataStats>('/api/cd-data/stats', {
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
    const response = await apiClient.get<string[]>('/api/cd-data/entities');
    return response.data;
  } catch (error) {
    console.error('Error fetching entities:', error);
    throw error;
  }
}

export async function fetchProcessTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/process-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching process types:', error);
    throw error;
  }
}

export async function fetchProductTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/product-types');
    return response.data;
  } catch (error) {
    console.error('Error fetching product types:', error);
    throw error;
  }
}

export async function fetchSPCMonitorNames(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/spc-monitor-names');
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

export interface SPCLimit {
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

export interface SPCLimitsFilters {
  process_type?: string;
  product_type?: string;
  spc_monitor_name?: string;
  spc_chart_name?: string;
}

export async function fetchProcessProductCombinations(): Promise<ProcessProductCombination[]> {
  return retryRequest(async () => {
    const response = await apiClient.get<ProcessProductCombination[]>('/api/cd-data/process-product-combinations');
    return response.data;
  });
}

export async function fetchSPCLimits(filters?: SPCLimitsFilters): Promise<SPCLimit[]> {
  return retryRequest(async () => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.process_type) params.append('process_type', filters.process_type);
      if (filters.product_type) params.append('product_type', filters.product_type);
      if (filters.spc_monitor_name) params.append('spc_monitor_name', filters.spc_monitor_name);
      if (filters.spc_chart_name) params.append('spc_chart_name', filters.spc_chart_name);
    }

    const response = await apiClient.get<SPCLimit[]>('/api/cd-data/spc-limits', {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  });
}