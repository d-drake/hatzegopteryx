import api from "@/lib/axios";
import { Item, CreateItem, UpdateItem, SPCCdL1, SPCCdL1Stats } from "@/types";

// Items API
export const itemsApi = {
  getAll: async (): Promise<Item[]> => {
    const response = await api.get<Item[]>("/api/items/");
    return response.data;
  },

  get: async (id: number): Promise<Item> => {
    const response = await api.get<Item>(`/api/items/${id}`);
    return response.data;
  },

  create: async (item: CreateItem): Promise<Item> => {
    const response = await api.post<Item>("/api/items/", item);
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

// SPC CD L1 Data API
export const spcCdL1Api = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    entity?: string;
  }): Promise<SPCCdL1[]> => {
    const response = await api.get<SPCCdL1[]>("/api/spc-cd-l1/", { params });
    return response.data;
  },

  getStats: async (params?: {
    start_date?: string;
    end_date?: string;
    entity?: string;
  }): Promise<SPCCdL1Stats> => {
    const response = await api.get<SPCCdL1Stats>("/api/spc-cd-l1/stats", {
      params,
    });
    return response.data;
  },

  getEntities: async (): Promise<string[]> => {
    const response = await api.get<string[]>("/api/spc-cd-l1/entities");
    return response.data;
  },
};
