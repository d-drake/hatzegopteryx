"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getSPCDataSourceConfig } from "@/lib/spc-dashboard/spcDataSourceRegistry";
import { useSPCConfig } from "@/hooks/useSPCConfig";
import Header from "@/components/auth/Header";
import AppTabs from "@/components/AppTabs";
import SPCTabs from "@/components/spc-dashboard/SPCTabs";
import { DatePicker } from "@/components/ui/date-picker";
import GenericStatisticsTabs from "@/components/spc-analytics/GenericStatisticsTabs";
import GenericDataTable from "@/components/spc-analytics/GenericDataTable";

interface GenericSPCAnalyticsProps {
  spcMonitor: string;
  processProduct: string;
}

export default function GenericSPCAnalytics({
  spcMonitor,
  processProduct,
}: GenericSPCAnalyticsProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get configuration for this monitor
  const config = getSPCDataSourceConfig(spcMonitor);
  const { analytics } = useSPCConfig(spcMonitor);

  // Use the appropriate context hook
  const contextData = config.contextHook();

  // Extract data and functions from context
  const {
    data: contextData_,
    allEntityData,
    isLoading: contextLoading,
    error: contextError,
    filters: contextFilters,
    handleFiltersChange,
    service,
  } = contextData;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct.split("-");

  // Independent entity filter for Analytics (not synced with context)
  const [localSelectedEntity, setLocalSelectedEntity] = useState<string>("");

  // Get service configurations from context service
  const metrics = service.getMetricConfig();
  const columns = service.getColumnConfig();

  // Get the first metric as default from configuration
  const defaultMetric = analytics?.statisticMetrics?.[0] || metrics[0]?.key || "";

  // Filter data based on entity selection
  const dataForAnalytics = useMemo(() => {
    // Always use allEntityData for analytics page to have all data
    // Then apply local entity filter if selected
    if (localSelectedEntity) {
      return allEntityData.filter((d: any) => d.entity === localSelectedEntity);
    }
    return allEntityData;
  }, [allEntityData, localSelectedEntity]);

  // Handle local entity change
  const handleLocalEntityChange = (entity: string) => {
    setLocalSelectedEntity(entity);
  };

  // Handle date filter changes
  const handleDateChange = (
    field: "startDate" | "endDate",
    value: string | undefined,
  ) => {
    const newFilters = {
      ...contextFilters,
      [field]: value || "",
    };
    handleFiltersChange(newFilters);
  };

  // Initialize local entity filter from URL
  useEffect(() => {
    const urlEntities = searchParams.get("selectedEntities");
    if (urlEntities) {
      const entities = urlEntities.split(",");
      if (entities.length > 0) {
        setLocalSelectedEntity(entities[0]);
      }
    }
  }, [searchParams]);

  // Get unique entities from all data
  const uniqueEntities = useMemo((): string[] => {
    const entities = allEntityData
      .map((d: any) => d.entity)
      .filter((entity: any): entity is string => typeof entity === 'string') as string[];
    return Array.from(new Set(entities)).sort();
  }, [allEntityData]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-slate-800 text-white">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Cloud Critical Dimension Hub</h1>
            <p className="text-slate-300 mt-2">
              {spcMonitor.replace(/_/g, " ")} Analytics
            </p>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <AppTabs />
          </div>

          <h2 className="text-2xl font-bold mb-6 text-black">SPC Analytics</h2>

          {/* Process/Product Selection */}
          <div className="mb-4">
            <SPCTabs spcMonitor={spcMonitor} processProduct={processProduct} basePath="/spc-analytics" />
          </div>

          {/* Current Selection Info */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-wrap gap-4 text-sm text-blue-800">
              <span>
                <strong>SPC Monitor:</strong> {spcMonitor}
              </span>
              <span>
                <strong>Process Type:</strong> {processType}
              </span>
              <span>
                <strong>Product Type:</strong> {productType}
              </span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white p-4 rounded-lg shadow-sm border mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Data Filters</h3>
              <button
                onClick={() => {
                  setLocalSelectedEntity("");
                  handleFiltersChange({
                    ...contextFilters,
                    startDate: "",
                    endDate: "",
                  });
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
                disabled={contextLoading}
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity
                </label>
                <select
                  value={localSelectedEntity}
                  onChange={(e) => handleLocalEntityChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat"
                  disabled={contextLoading}
                >
                  <option value="">All Entities</option>
                  {uniqueEntities.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <DatePicker
                  value={contextFilters.startDate}
                  onChange={(date) => handleDateChange("startDate", date)}
                  disabled={contextLoading}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <DatePicker
                  value={contextFilters.endDate}
                  onChange={(date) => handleDateChange("endDate", date)}
                  disabled={contextLoading}
                  placeholder="Select end date"
                />
              </div>

              <div className="flex items-end">
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Total records: {allEntityData.length.toLocaleString()}
                  </div>
                  <div>
                    Filtered records: {dataForAnalytics.length.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <GenericStatisticsTabs
            data={dataForAnalytics}
            allData={allEntityData}
            selectedEntity={localSelectedEntity}
            metrics={metrics}
            defaultMetric={defaultMetric}
          />

          {/* Data Table Section */}
          <div className="mt-4">
            <GenericDataTable
              data={dataForAnalytics}
              columns={columns}
              loading={contextLoading}
              pageSize={50}
            />
          </div>
        </div>
      </div>
    </>
  );
}