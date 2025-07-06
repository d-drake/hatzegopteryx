"use client";

import { useState, useMemo } from "react";
import { SPCDataItem, MetricConfig } from "@/types";
import { useSPCLimits } from "@/contexts/SPCLimitsContext";

interface GenericStatisticsTabsProps<T extends SPCDataItem> {
  data: T[];
  selectedEntity?: string;
  metrics: MetricConfig[];
  defaultMetric?: string;
}

interface EntityStats {
  entity: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  withinLimits?: boolean;
}

const calculateStats = (values: number[]): Omit<EntityStats, "entity"> => {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
  }

  // Sort values for median calculation
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // Calculate standard deviation
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  // Min and Max
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { mean, median, stdDev, min, max };
};

export default function GenericStatisticsTabs<T extends SPCDataItem>({
  data,
  selectedEntity,
  metrics,
  defaultMetric,
}: GenericStatisticsTabsProps<T>) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultMetric || metrics[0]?.key || "",
  );
  const { getLimitsForChart, isLoading: limitsLoading } = useSPCLimits();

  // Get SPC limits for the active chart
  const activeLimits = useMemo(() => {
    const limits = getLimitsForChart(activeTab);
    // Sort by effective date and get the most recent
    if (limits.length > 0) {
      return limits.sort(
        (a, b) =>
          new Date(b.effective_date).getTime() -
          new Date(a.effective_date).getTime(),
      )[0];
    }
    return null;
  }, [activeTab, getLimitsForChart]);

  // Find the active metric config
  const activeMetricConfig = metrics.find((m) => m.key === activeTab);

  // Calculate statistics for the active metric
  const statistics = useMemo(() => {
    const results: EntityStats[] = [];

    // Get all values for the current metric (always use full data for "All" statistics)
    const allValues = data
      .map((d) => (d as any)[activeTab])
      .filter((v) => v != null && typeof v === "number");

    // Calculate "All" statistics
    if (allValues.length > 0) {
      const stats = calculateStats(allValues);
      const withinLimits = activeLimits
        ? (activeLimits.lcl === null ||
            activeLimits.lcl === undefined ||
            stats.mean >= activeLimits.lcl) &&
          (activeLimits.ucl === null ||
            activeLimits.ucl === undefined ||
            stats.mean <= activeLimits.ucl)
        : undefined;

      results.push({
        entity: "All",
        ...stats,
        withinLimits,
      });
    }

    // Calculate per-entity statistics
    if (selectedEntity) {
      // When an entity is selected, show only that entity
      const entityData = data.filter((d) => d.entity === selectedEntity);
      const entityValues = entityData
        .map((d) => (d as any)[activeTab])
        .filter((v) => v != null && typeof v === "number");

      if (entityValues.length > 0) {
        const stats = calculateStats(entityValues);
        const withinLimits = activeLimits
          ? (activeLimits.lcl === null ||
              activeLimits.lcl === undefined ||
              stats.mean >= activeLimits.lcl) &&
            (activeLimits.ucl === null ||
              activeLimits.ucl === undefined ||
              stats.mean <= activeLimits.ucl)
          : undefined;

        results.push({
          entity: selectedEntity,
          ...stats,
          withinLimits,
        });
      }
    } else {
      // When no entity is selected, show all entities
      // Get unique entities from the data dynamically
      const entities = Array.from(new Set(data.map((d) => d.entity))).sort();

      entities.forEach((entity) => {
        const entityData = data.filter((d) => d.entity === entity);
        const entityValues = entityData
          .map((d) => (d as any)[activeTab])
          .filter((v) => v != null && typeof v === "number");

        if (entityValues.length > 0) {
          const stats = calculateStats(entityValues);
          const withinLimits = activeLimits
            ? (activeLimits.lcl === null ||
                activeLimits.lcl === undefined ||
                stats.mean >= activeLimits.lcl) &&
              (activeLimits.ucl === null ||
                activeLimits.ucl === undefined ||
                stats.mean <= activeLimits.ucl)
            : undefined;

          results.push({
            entity,
            ...stats,
            withinLimits,
          });
        }
      });
    }

    return results;
  }, [data, activeTab, selectedEntity, activeLimits]);

  // Format number with appropriate precision
  const formatNumber = (value: number, isStdDev = false): string => {
    const precision = activeMetricConfig?.precision ?? 2;
    if (isStdDev) {
      return value.toFixed(precision + 1);
    }
    return value.toFixed(precision);
  };

  // Format with unit if available
  const formatWithUnit = (value: number, isStdDev = false): string => {
    const formatted = formatNumber(value, isStdDev);
    if (activeMetricConfig?.unit) {
      return `${formatted} ${activeMetricConfig.unit}`;
    }
    return formatted;
  };

  // Check if a value is outside control limits
  const isOutsideLimits = (value: number): boolean => {
    if (!activeLimits) return false;

    const exceedsUCL =
      activeLimits.ucl !== null &&
      activeLimits.ucl !== undefined &&
      value > activeLimits.ucl;
    const belowLCL =
      activeLimits.lcl !== null &&
      activeLimits.lcl !== undefined &&
      value < activeLimits.lcl;

    return exceedsUCL || belowLCL;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 text-black">
        Detailed Statistics
      </h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setActiveTab(metric.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === metric.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {metric.label}
            </button>
          ))}
        </nav>
      </div>

      {/* SPC Control Limits */}
      {limitsLoading ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      ) : activeLimits ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Current Control Limits
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">UCL: </span>
              <span className="font-medium text-gray-900">
                {activeLimits.ucl !== null && activeLimits.ucl !== undefined
                  ? formatWithUnit(activeLimits.ucl)
                  : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">CL: </span>
              <span className="font-medium text-gray-900">
                {activeLimits.cl !== null && activeLimits.cl !== undefined
                  ? formatWithUnit(activeLimits.cl)
                  : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">LCL: </span>
              <span className="font-medium text-gray-900">
                {activeLimits.lcl !== null && activeLimits.lcl !== undefined
                  ? formatWithUnit(activeLimits.lcl)
                  : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Effective: </span>
              <span className="font-medium text-gray-900">
                {new Date(activeLimits.effective_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            No control limits defined for{" "}
            {activeMetricConfig?.label || activeTab}
          </p>
        </div>
      )}

      {/* Statistics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mean
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Median
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Std Dev
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr
                key={stat.entity}
                className={stat.entity === "All" ? "bg-gray-50" : ""}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {stat.entity}
                  {stat.withinLimits !== undefined && (
                    <span
                      className={`ml-2 text-xs ${stat.withinLimits ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.withinLimits ? "✓" : "✗"}
                    </span>
                  )}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                    isOutsideLimits(stat.mean)
                      ? "text-red-600 font-semibold"
                      : "text-gray-900"
                  }`}
                >
                  {formatWithUnit(stat.mean)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatWithUnit(stat.median)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatWithUnit(stat.stdDev, true)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatWithUnit(stat.min)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatWithUnit(stat.max)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
