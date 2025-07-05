import apiClient from '@/lib/axios';
import { AxiosError } from 'axios';

// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // In development, you can uncomment the following for debugging:
    // console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    // if (config.params) {
    //   console.log('Request params:', config.params);
    // }
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
        // Check if response data is valid JSON by trying to stringify it
        JSON.stringify(response.data);
      } catch (e) {
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
      // Request timeout
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        // Retry after header available
      }
      // Consider reducing request frequency or implementing request queuing
    } else if (error.response?.status >= 500) {
      // Server error
      // Response data available for debugging if needed
    } else if (!error.response) {
      // Network error
    } else {
      // API Error with status code
    }
    
    // Handle JSON parsing issues
    if (error.message?.includes('JSON')) {
      // Check if we got HTML instead of JSON (common in server errors)
      if (typeof error.response?.data === 'string' && error.response.data.includes('<html>')) {
        // Received HTML response instead of JSON - likely a server error page
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
        // Get retry-after header if available
        const retryAfter = error.response.headers['retry-after'];
        let waitTime = delay;
        
        if (retryAfter) {
          // If retry-after is a number, it's seconds
          // If it contains a date, parse it
          waitTime = isNaN(Number(retryAfter)) 
            ? new Date(retryAfter).getTime() - Date.now()
            : Number(retryAfter) * 1000;
          
          // Ensure minimum wait time
          waitTime = Math.max(waitTime, delay);
        } else {
          // Use exponential backoff for rate limiting
          waitTime = delay * Math.pow(2, attempt);
        }
        
        // Rate limit hit (429). Waiting before retry
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
        // Request failed, retrying
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
    // Error fetching CD data stats
    throw error;
  }
}

export async function fetchEntities(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/entities');
    return response.data;
  } catch (error) {
    // Error fetching entities
    throw error;
  }
}

export async function fetchProcessTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/process-types');
    return response.data;
  } catch (error) {
    // Error fetching process types
    throw error;
  }
}

export async function fetchProductTypes(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/product-types');
    return response.data;
  } catch (error) {
    // Error fetching product types
    throw error;
  }
}

export async function fetchSPCMonitorNames(): Promise<string[]> {
  try {
    const response = await apiClient.get<string[]>('/api/cd-data/spc-monitor-names');
    return response.data;
  } catch (error) {
    // Error fetching SPC monitor names
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