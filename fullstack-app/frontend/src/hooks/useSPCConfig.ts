import { useMemo } from "react";
import {
  loadSPCConfig,
  getMetricsConfig,
  getChartConfigs,
  getAnalyticsConfig,
  getTableColumns,
  getStatisticMetrics,
  getColorFields,
  getShapeFields,
} from "@/lib/spc-dashboard/config/loader";
import { MetricConfig } from "@/types";

/**
 * Hook to get SPC configuration for a monitor
 */
export function useSPCConfig(monitorId: string) {
  const config = useMemo(() => loadSPCConfig(monitorId), [monitorId]);

  const metrics = useMemo(() => {
    if (!config) return [];
    return Object.values(config.metrics);
  }, [config]);

  const charts = useMemo(() => {
    if (!config) return [];
    return config.charts;
  }, [config]);

  const analytics = useMemo(() => {
    if (!config) return null;
    return config.analytics;
  }, [config]);

  return {
    config,
    metrics,
    charts,
    analytics,
    isLoaded: !!config,
  };
}

/**
 * Hook to get metric configurations formatted for GenericStatisticsTabs
 */
export function useSPCMetricConfig(monitorId: string): MetricConfig[] {
  const config = useMemo(() => loadSPCConfig(monitorId), [monitorId]);

  return useMemo(() => {
    if (!config) return [];

    const statisticMetrics = config.analytics.statisticMetrics;

    return statisticMetrics
      .map((metricKey) => {
        const metric = config.metrics[metricKey];
        if (!metric) return null;

        return {
          key: metric.key,
          label: metric.label,
          precision: metric.precision,
          unit: metric.unit,
        } as MetricConfig;
      })
      .filter(Boolean) as MetricConfig[];
  }, [config]);
}

/**
 * Hook to get column configurations formatted for GenericDataTable
 */
export function useSPCTableColumns(monitorId: string) {
  return useMemo(() => {
    const columns = getTableColumns(monitorId);

    // Transform to match GenericDataTable format
    return columns.map((col) => ({
      key: col.key,
      label: col.label,
      sortable: col.sortable ?? true,
      align: col.align || "left",
      format: (value: any) => {
        if (value == null) return "-";

        if (col.format === "datetime") {
          return new Date(value).toLocaleString();
        }

        if (typeof value === "number" && col.precision !== undefined) {
          const formatted = value.toFixed(col.precision);
          return col.unit ? `${formatted} ${col.unit}` : formatted;
        }

        return String(value);
      },
    }));
  }, [monitorId]);
}
