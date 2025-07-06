"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useViewportWidth } from "@/hooks/useViewportWidth";
import { getSPCDataSourceConfig } from "@/lib/spc-dashboard/spcDataSourceRegistry";
import Header from "@/components/auth/Header";
import AppTabs from "@/components/AppTabs";
import DashboardInstructions from "@/components/spc-dashboard/DashboardInstructions";
import SPCTabs from "@/components/spc-dashboard/SPCTabs";
import FilterControls from "@/components/spc-dashboard/FilterControls";
import ConfiguredCharts from "@/components/spc-dashboard/ConfiguredCharts";
import { useSPCConfig } from "@/hooks/useSPCConfig";

interface GenericSPCDashboardProps {
  spcMonitor: string;
  processProduct: string;
}

export default function GenericSPCDashboard({
  spcMonitor,
  processProduct,
}: GenericSPCDashboardProps) {
  const { user } = useAuth();
  const isGuest = !user;
  const viewportWidth = useViewportWidth();

  // Get configuration for this monitor
  const config = getSPCDataSourceConfig(spcMonitor);
  const { charts } = useSPCConfig(spcMonitor);

  // Use the appropriate context hook
  const contextData = config.contextHook();

  // Extract data and functions from context
  const {
    data,
    isLoading: loading,
    error,
    filters,
    handleFiltersChange,
    refetch,
  } = contextData;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct.split("-");

  // State for synchronized view switching
  const [syncViews, setSyncViews] = useState(true);
  const [activeView, setActiveView] = useState<"timeline" | "variability">(
    "timeline"
  );

  // State for synchronized statistics collapse/expand
  const [statisticsCollapsed, setStatisticsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("spc-dashboard-statistics-collapsed") === "true"
      );
    }
    return true;
  });

  // Save statistics preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "spc-dashboard-statistics-collapsed",
        String(statisticsCollapsed)
      );
    }
  }, [statisticsCollapsed]);

  const toggleStatisticsCollapsed = () => {
    setStatisticsCollapsed((prev) => !prev);
  };

  // Determine if tabs should be visible
  const areTabsVisible = !isGuest || viewportWidth >= 768;

  // Get display name for the monitor
  const getMonitorDisplayName = () => {
    return spcMonitor.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Cloud Critical Dimension Hub</h1>
          <p className="text-slate-300 mt-2">
            {getMonitorDisplayName()} Dashboard
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AppTabs />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            SPC Data Dashboard
          </h2>
        </div>

        {/* Dashboard Instructions */}
        <DashboardInstructions className="mb-6" />

        {/* SPC Monitor and Process-Product Tabs */}
        <div className="mb-6">
          <SPCTabs spcMonitor={spcMonitor} processProduct={processProduct} />
        </div>

        {/* Current Selection Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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

        <FilterControls
          filters={filters}
          onFiltersChange={handleFiltersChange}
          loading={loading}
          spcMonitor={spcMonitor}
        />

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => refetch()}
                className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={loading}
              >
                {loading ? "Retrying..." : "Retry"}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-black">
                {charts && charts.length > 0
                  ? `${spcMonitor.toUpperCase()} Measurement Analysis`
                  : "Measurement Analysis"}
              </h3>
              {areTabsVisible && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncViews}
                      onChange={(e) => setSyncViews(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${syncViews ? "bg-blue-600" : "bg-gray-200"
                        }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${syncViews ? "translate-x-6" : "translate-x-1"
                          }`}
                      />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">
                      Sync Chart Views
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Configuration-driven charts */}
            <ConfiguredCharts
              spcMonitor={spcMonitor}
              data={data}
              processType={processType}
              productType={productType}
              syncViews={syncViews}
              activeView={activeView}
              onViewChange={setActiveView}
              statisticsCollapsed={statisticsCollapsed}
              onToggleStatisticsCollapsed={toggleStatisticsCollapsed}
            />
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            No data available for the selected filters.
          </div>
        )}
      </main>
    </div>
  );
}