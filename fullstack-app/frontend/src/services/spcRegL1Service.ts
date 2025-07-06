import apiClient from '@/lib/axios';
import { AxiosError } from 'axios';

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors better
apiClient.interceptors.response.use(
  (response) => {
    // Validate JSON response content
    if (response.headers['content-type']?.includes('application/json')) {
      try {
        JSON.stringify(response.data);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }
    }
    
    return response;
  },
  (error) => {
    // Handle JSON parsing issues
    if (error.message?.includes('JSON')) {
      if (typeof error.response?.data === 'string' && error.response.data.includes('<html>')) {
        throw new Error('Server returned HTML instead of JSON - possible server error');
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
      
      // Handle 429 rate limit errors with special logic
      if (error instanceof AxiosError && error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        let waitTime = delay;
        
        if (retryAfter) {
          waitTime = isNaN(Number(retryAfter)) 
            ? new Date(retryAfter).getTime() - Date.now()
            : Number(retryAfter) * 1000;
          waitTime = Math.max(waitTime, delay);
        } else {
          waitTime = delay * Math.pow(2, attempt);
        }
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Only retry on network errors, timeouts, 5xx server errors, or JSON parsing errors
      const shouldRetry = error instanceof AxiosError && 
          (error.code === 'ECONNABORTED' || 
           !error.response || 
           error.response.status >= 500 ||
           error.message?.includes('JSON') ||
           error.message?.includes('Invalid JSON response'));
           
      if (shouldRetry) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}

export interface SPCRegL1Item {
  lot: string;
  date_process: string;
  process_type: string;
  product_type: string;
  spc_monitor_name: string;
  entity: string;
  fake_property1: string;
  fake_property2: string;
  recipe_scale_x: number;
  recipe_scale_y: number;
  recipe_ortho: number;
  scale_x: number;
  scale_y: number;
  ortho: number;
  centrality_x: number;
  centrality_y: number;
  centrality_rotation: number;
}

export interface SPCRegL1Filters {
  entity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  process_type?: string;
  product_type?: string;
  spc_monitor_name?: string;
}

export interface SPCRegL1Stats {
  total_count: number;
  avg_scale_x: number;
  min_scale_x: number;
  max_scale_x: number;
  avg_scale_y: number;
  avg_ortho: number;
  avg_centrality_x: number;
  avg_centrality_y: number;
  avg_centrality_rotation: number;
}

export async function fetchSPCRegL1Data(filters?: SPCRegL1Filters): Promise<SPCRegL1Item[]> {
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

    const response = await apiClient.get<SPCRegL1Item[]>('/api/spc-reg-l1/', {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  });
}

export async function fetchSPCRegL1Stats(filters?: SPCRegL1Filters): Promise<SPCRegL1Stats> {
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.process_type) params.append('process_type', filters.process_type);
      if (filters.product_type) params.append('product_type', filters.product_type);
      if (filters.spc_monitor_name) params.append('spc_monitor_name', filters.spc_monitor_name);
    }

    const response = await apiClient.get<SPCRegL1Stats>('/api/spc-reg-l1/stats', {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
}


export async function fetchProcessTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/spc-reg-l1/process-types');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function fetchProductTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/spc-reg-l1/product-types');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function fetchSPCMonitorNames(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/spc-reg-l1/spc-monitor-names');
    return response.data;
  } catch (error) {
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
    const response = await apiClient.get<ProcessProductCombination[]>('/api/spc-reg-l1/process-product-combinations');
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

    const response = await apiClient.get<SPCLimit[]>('/api/spc-reg-l1/spc-limits', {
      params: params.toString() ? params : undefined,
    });
    
    return response.data;
  });
}