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