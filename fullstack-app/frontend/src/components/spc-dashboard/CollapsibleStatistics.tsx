"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
export interface StatisticsConfig {
  supportedMetrics: string[];
  groupByEntity: boolean;
}

interface CollapsibleStatisticsProps {
  data: any[]; // Generic data array
  metric: string;
  chartTitle: string;
  config: StatisticsConfig; // Configuration object
  // External state management for synchronized collapse/expand
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface EntityStats {
  entity: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
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

export default function CollapsibleStatistics({
  data,
  metric,
  chartTitle,
  config,
  isCollapsed: externalIsCollapsed,
  onToggleCollapsed,
}: CollapsibleStatisticsProps) {
  const storageKey = `spc-dashboard-statistics-${metric}-collapsed`;

  const [internalIsCollapsed, setInternalIsCollapsed] = useState(() => {
    // Check localStorage on mount
    if (typeof window !== "undefined") {
      return localStorage.getItem(storageKey) === "true";
    }
    return true; // Default to collapsed
  });

  // Save preference to localStorage whenever internal state changes
  useEffect(() => {
    if (typeof window !== "undefined" && externalIsCollapsed === undefined) {
      localStorage.setItem(storageKey, internalIsCollapsed.toString());
    }
  }, [internalIsCollapsed, storageKey, externalIsCollapsed]);

  // Use external state if provided, otherwise use internal state
  const isCollapsed =
    externalIsCollapsed !== undefined
      ? externalIsCollapsed
      : internalIsCollapsed;

  // Calculate statistics
  const statistics = useMemo(() => {
    const results: EntityStats[] = [];

    // Get all values for the current metric
    const allValues = data.map((d) => d[metric]).filter((v) => v != null);

    // Always calculate "All" statistics
    if (allValues.length > 0) {
      const stats = calculateStats(allValues);
      results.push({
        entity: "All",
        ...stats,
      });
    }

    // Conditionally group by entity based on configuration
    if (config.groupByEntity && data.length > 0) {
      // Check if data has entity field (defensive programming)
      const hasEntityField = data.some((d) => "entity" in d);

      if (hasEntityField) {
        const entities = Array.from(new Set(data.map((d) => d.entity))).sort();

        entities.forEach((entity) => {
          const entityData = data.filter((d) => d.entity === entity);
          const entityValues = entityData
            .map((d) => d[metric])
            .filter((v) => v != null);

          if (entityValues.length > 0) {
            const stats = calculateStats(entityValues);
            results.push({
              entity,
              ...stats,
            });
          }
        });
      }
    }

    return results;
  }, [data, metric, config]);

  // Format number with appropriate precision
  const formatNumber = (value: number, isStdDev = false): string => {
    if (isStdDev) {
      return value.toFixed(3);
    }
    return value.toFixed(2);
  };

  const toggleCollapsed = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border mt-4">
      <button
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        className="w-full p-3 flex justify-between items-center text-left hover:bg-gray-50 transition-colors duration-200"
      >
        <span className="text-gray-800 font-medium text-sm">
          Statistics for {chartTitle}
        </span>
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isCollapsed ? "max-h-0" : "max-h-[600px]"
        }`}
      >
        <div className="px-2 pb-2">
          {/* Statistics Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Mean
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Median
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Std Dev
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Min
                  </th>
                  <th className="px-2 py-1 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Max
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.map((stat) => (
                  <tr
                    key={stat.entity}
                    className={
                      stat.entity === "All" ? "bg-blue-50 font-semibold" : ""
                    }
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                      {stat.entity === "All" ? "All Entities" : stat.entity}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                      {formatNumber(stat.mean)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                      {formatNumber(stat.median)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                      {formatNumber(stat.stdDev, true)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                      {formatNumber(stat.min)}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                      {formatNumber(stat.max)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {statistics.length === 0 && (
              <div className="text-center py-2 text-xs text-gray-500">
                No data available for statistics calculation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
