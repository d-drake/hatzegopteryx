import axios from 'axios';
import { Item, CreateItem, UpdateItem, CDData, CDDataStats } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Items API
export const itemsApi = {
  getAll: async (): Promise<Item[]> => {
    const response = await api.get<Item[]>('/api/items/');
    return response.data;
  },

  get: async (id: number): Promise<Item> => {
    const response = await api.get<Item>(`/api/items/${id}`);
    return response.data;
  },

  create: async (item: CreateItem): Promise<Item> => {
    const response = await api.post<Item>('/api/items/', item);
    return response.data;
  },

  update: async (id: number, item: UpdateItem): Promise<Item> => {
    const response = await api.put<Item>(`/api/items/${id}`, item);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/items/${id}`);
  },
};

// CD Data API
export const cdDataApi = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    entity?: string;
  }): Promise<CDData[]> => {
    const response = await api.get<CDData[]>('/api/cd-data/', { params });
    return response.data;
  },

  getStats: async (params?: {
    start_date?: string;
    end_date?: string;
    entity?: string;
  }): Promise<CDDataStats> => {
    const response = await api.get<CDDataStats>('/api/cd-data/stats', { params });
    return response.data;
  },

  getEntities: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/api/cd-data/entities');
    return response.data;
  },
};