import {
  SPCMonitorConfig,
  MetricDefinition,
  ChartConfig,
  ColumnConfig,
} from "./types";
// Import TypeScript configurations (generated from YAML files)
import { spcCdL1Config } from "./metrics/generated/spc-cd-l1";
import { spcRegL1Config } from "./metrics/generated/spc-reg-l1";

// Configuration cache
const configCache = new Map<string, SPCMonitorConfig>();

// Pre-load configurations
const configs: Record<string, SPCMonitorConfig> = {
  SPC_CD_L1: spcCdL1Config,
  SPC_REG_L1: spcRegL1Config,
};

// Initialize cache
Object.entries(configs).forEach(([key, config]) => {
  configCache.set(key, config);
});

/**
 * Load SPC configuration by monitor ID
 */
export function loadSPCConfig(monitorId: string): SPCMonitorConfig | undefined {
  return configCache.get(monitorId);
}

/**
 * Get metric configuration for a specific metric
 */
export function getMetricConfig(
  monitorId: string,
  metricKey: string,
): MetricDefinition | undefined {
  const config = configCache.get(monitorId);
  return config?.metrics[metricKey];
}

/**
 * Get all metric configurations for a monitor
 */
export function getMetricsConfig(monitorId: string): MetricDefinition[] {
  const config = configCache.get(monitorId);
  if (!config) return [];

  return Object.values(config.metrics);
}

/**
 * Get chart configurations for a monitor
 */
export function getChartConfigs(monitorId: string): ChartConfig[] {
  const config = configCache.get(monitorId);
  return config?.charts || [];
}

/**
 * Get analytics configuration for a monitor
 */
export function getAnalyticsConfig(monitorId: string) {
  const config = configCache.get(monitorId);
  return config?.analytics;
}

/**
 * Get table column configurations
 */
export function getTableColumns(monitorId: string): ColumnConfig[] {
  const config = configCache.get(monitorId);
  return config?.analytics.tableColumns || [];
}

/**
 * Get statistic metrics for analytics
 */
export function getStatisticMetrics(monitorId: string): string[] {
  const config = configCache.get(monitorId);
  return config?.analytics.statisticMetrics || [];
}

/**
 * Get available color fields
 */
export function getColorFields(monitorId: string): string[] {
  const config = configCache.get(monitorId);
  return config?.fields.colorFields || [];
}

/**
 * Get available shape fields
 */
export function getShapeFields(monitorId: string): string[] {
  const config = configCache.get(monitorId);
  return config?.fields.shapeFields || [];
}

/**
 * Check if a monitor configuration exists
 */
export function hasMonitorConfig(monitorId: string): boolean {
  return configCache.has(monitorId);
}

