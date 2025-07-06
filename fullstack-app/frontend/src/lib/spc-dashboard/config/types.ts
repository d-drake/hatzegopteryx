// Configuration types for SPC metric system

export interface MetricDefinition {
  key: string;
  label: string;
  unit?: string;
  precision?: number;
  description?: string;
}

export interface AxisConfig {
  field: string;
  label: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  metric: string;
  type: "timeline" | "variability";
  yAxis: AxisConfig;
  y2Axis?: AxisConfig;
  colorField?: string;
  shapeField?: string;
  showStatistics?: boolean;
  showLimits?: boolean;
}

export interface ColumnConfig {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  unit?: string;
  precision?: number;
  format?: "number" | "datetime" | "string";
}

export interface SPCMonitorConfig {
  monitor: {
    id: string;
    name: string;
    dataType: string;
  };
  metrics: Record<string, MetricDefinition>;
  charts: ChartConfig[];
  analytics: {
    statisticMetrics: string[];
    tableColumns: ColumnConfig[];
  };
  fields: {
    colorFields: string[];
    shapeFields: string[];
  };
}

// Helper type to extract metric keys from config
export type MetricKeys<T extends SPCMonitorConfig> = keyof T["metrics"];

// Helper type to validate chart metric references
export type ChartMetricValidator<T extends SPCMonitorConfig> =
  T["charts"][number]["metric"] extends MetricKeys<T> ? true : false;
