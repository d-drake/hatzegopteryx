"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { SPCCdL1 } from "@/types";
import Header from "@/components/auth/Header";
import AppTabs from "@/components/AppTabs";
import SPCTabs from "@/components/spc-dashboard/SPCTabs";
import { useAuth } from "@/contexts/AuthContext";
import { SPCCdL1Provider, useSPCCdL1 } from "@/contexts/SPCCdL1Context";
import { SPCLimitsProvider } from "@/contexts/SPCLimitsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DatePicker } from "@/components/ui/date-picker";
import GenericStatisticsTabs from "@/components/spc-analytics/GenericStatisticsTabs";
import GenericDataTable from "@/components/spc-analytics/GenericDataTable";

function SPCAnalyticsInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Use SPCCdL1Context for shared data
  const {
    data: contextData,
    allEntityData,
    isLoading: contextLoading,
    error: contextError,
    filters: contextFilters,
    handleFiltersChange,
    service,
  } = useSPCCdL1();

  const spcMonitor = params.spcMonitor as string;
  const processProduct = params.processProduct as string;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct
    ? processProduct.split("-")
    : ["", ""];

  // Independent entity filter for Analytics (not synced with context)
  const [localSelectedEntity, setLocalSelectedEntity] = useState<string>("");

  // Get service configurations from context service
  const metrics = service.getMetricConfig();
  const columns = service.getColumnConfig();

  // Filter data based on entity selection
  const dataForAnalytics = useMemo(() => {
    // Always use allEntityData for analytics page to have all data
    // Then apply local entity filter if selected
    if (localSelectedEntity) {
      return allEntityData.filter((d) => d.entity === localSelectedEntity);
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
  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(allEntityData.map((d) => d.entity))).sort();
  }, [allEntityData]);

  return (
    <SPCLimitsProvider
      processType={processType}
      productType={productType}
      spcMonitor={spcMonitor}
      service={service}
    >
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppTabs activeTab="spc" />

        <div className="mt-6">
          <SPCTabs
            processProduct={processProduct}
            spcMonitor={spcMonitor}
            basePath="/spc-analytics"
          />
        </div>

        <div className="mt-6 space-y-6">
          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <DatePicker
                  value={contextFilters.startDate}
                  onChange={(date) => handleDateChange("startDate", date)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <DatePicker
                  value={contextFilters.endDate}
                  onChange={(date) => handleDateChange("endDate", date)}
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
            selectedEntity={localSelectedEntity}
            metrics={metrics}
            defaultMetric="cd_att"
          />

          {/* Data Table Section */}
          <GenericDataTable
            data={dataForAnalytics}
            columns={columns}
            loading={contextLoading}
            pageSize={50}
          />
        </div>
      </div>
    </SPCLimitsProvider>
  );
}

export default function SPCAnalyticsPage() {
  const params = useParams();
  const spcMonitor = params.spcMonitor as string;
  const processProduct = params.processProduct as string;
  const [processType, productType] = processProduct
    ? processProduct.split("-")
    : ["", ""];

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <SPCCdL1Provider
          processType={processType}
          productType={productType}
          spcMonitorName={spcMonitor}
          processProduct={processProduct}
        >
          <SPCAnalyticsInner />
        </SPCCdL1Provider>
      </ErrorBoundary>
    </div>
  );
}

