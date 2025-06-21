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
  entity: string;
  fake_property1: string;
  fake_property2: string;
}

export interface CDDataStats {
  total_count: number;
  avg_cd_att: number;
  min_cd_att: number;
  max_cd_att: number;
  avg_cd_6sig: number;
  avg_property1: number;
  avg_property2: number;
}