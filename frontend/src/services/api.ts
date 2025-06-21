import axios from 'axios';
import { Item, CreateItem, UpdateItem } from '../types/Item';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

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