import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CDDataItem {
  id: number;
  datetime: string;
  bias: number;
  bias_x_y: number;
  cd_att: number;
  cd_x_y: number;
  cd_6sig: number;
  entity: string;
  fake_property1: number;
  fake_property2: number;
}

export interface CDDataFilters {
  entity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
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