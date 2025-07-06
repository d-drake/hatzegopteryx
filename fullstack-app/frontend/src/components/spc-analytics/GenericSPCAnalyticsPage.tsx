"use client";

import { useState, useEffect, useMemo } from "react";
import { SPCDataItem, MetricConfig, ColumnConfig } from "@/types";
import { FilterState } from "@/components/spc-dashboard/FilterControls";
import GenericStatisticsTabs from "./GenericStatisticsTabs";
import GenericDataTable from "./GenericDataTable";
import { SPCDataServiceFactory } from "@/services/spc/SPCDataServiceFactory";
import { ISPCDataService } from "@/services/spc/ISPCDataService";

interface GenericSPCAnalyticsPageProps<T extends SPCDataItem> {
  spcMonitor: string;
  processType: string;
  productType: string;
  data: T[];
  loading?: boolean;
  error?: string | null;
  onFiltersChange?: (filters: FilterState) => void;
  selectedEntity?: string;
}

export default function GenericSPCAnalyticsPage<T extends SPCDataItem>({
  spcMonitor,
  processType,
  productType,
  data,
  loading = false,
  error = null,
  onFiltersChange,
  selectedEntity,
}: GenericSPCAnalyticsPageProps<T>) {
  const [localSelectedEntity, setLocalSelectedEntity] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Get the appropriate service and configurations
  const service = useMemo(() => {
    return SPCDataServiceFactory.create(spcMonitor) as ISPCDataService<T>;
  }, [spcMonitor]);

  const metricConfig = service.getMetricConfig();
  const columnConfig = service.getColumnConfig();

  // Initialize local filters
  useEffect(() => {
    if (selectedEntity) {
      setLocalSelectedEntity(selectedEntity);
    }
  }, [selectedEntity]);

  // Filter data based on entity selection
  const dataForAnalytics = useMemo(() => {
    if (localSelectedEntity) {
      return data.filter((d) => d.entity === localSelectedEntity);
    }
    return data;
  }, [data, localSelectedEntity]);

  // Handle local filter changes
  const handleLocalEntityChange = (entity: string) => {
    setLocalSelectedEntity(entity);
    if (onFiltersChange) {
      onFiltersChange({
        entity,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
    }
  };

  const handleDateChange = (startDate: string, endDate: string) => {
    setFilterStartDate(startDate);
    setFilterEndDate(endDate);
    if (onFiltersChange) {
      onFiltersChange({
        entity: localSelectedEntity,
        startDate,
        endDate,
      });
    }
  };

  // Get unique entities for filter
  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(data.map((d) => d.entity))).sort();
  }, [data]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          SPC Analytics - {spcMonitor}
        </h1>
        <p className="text-gray-600">
          Process: {processType} | Product: {productType}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Entity Filter */}
          <div>
            <label
              htmlFor="entity-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Entity
            </label>
            <select
              id="entity-filter"
              value={localSelectedEntity}
              onChange={(e) => handleLocalEntityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div>
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => handleDateChange(e.target.value, filterEndDate)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) =>
                handleDateChange(filterStartDate, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <GenericStatisticsTabs
        data={dataForAnalytics}
        selectedEntity={localSelectedEntity}
        metrics={metricConfig}
      />

      {/* Data Table */}
      <GenericDataTable
        data={dataForAnalytics}
        columns={columnConfig}
        loading={loading}
        pageSize={50}
      />
    </div>
  );
}
