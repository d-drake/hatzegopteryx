'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import SPCTimeline from '@/components/spc-dashboard/SPCTimeline';
import FilterControls from '@/components/spc-dashboard/FilterControls';
import SPCTabs from '@/components/spc-dashboard/SPCTabs';
import AppTabs from '@/components/AppTabs';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';
import SPCChartWrapper from '@/components/spc-dashboard/SPCChartWrapper';
import { SPCVariabilityChart } from '@/components/spc-dashboard/SPCVariabilityChart';
import SPCChartWithSharedData from '@/components/spc-dashboard/SPCChartWithSharedData';
import { SPCLimitsProvider } from '@/contexts/SPCLimitsContext';
import { SPCCdL1Provider, useSPCCdL1 } from '@/contexts/SPCCdL1Context';
import Header from '@/components/auth/Header';
import { useAuth } from '@/contexts/AuthContext';
import DashboardInstructions from '@/components/spc-dashboard/DashboardInstructions';
import { useViewportWidth } from '@/hooks/useViewportWidth';

function SPCDashboardInner() {
  const params = useParams();
  const { user } = useAuth();
  const {
    data,
    isLoading: loading,
    error,
    filters,
    handleFiltersChange,
    refetch
  } = useSPCCdL1();

  const isGuest = !user;
  const viewportWidth = useViewportWidth();

  // State for synchronized view switching
  const [syncViews, setSyncViews] = useState(true); // Default to synced
  const [activeView, setActiveView] = useState<'timeline' | 'variability'>('timeline');

  // State for synchronized statistics collapse/expand
  const [statisticsCollapsed, setStatisticsCollapsed] = useState(() => {
    // Check localStorage on mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spc-dashboard-statistics-collapsed') === 'true';
    }
    return true; // Default to collapsed
  });

  // Save statistics preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('spc-dashboard-statistics-collapsed', statisticsCollapsed.toString());
    }
  }, [statisticsCollapsed]);

  const toggleStatisticsCollapsed = () => {
    setStatisticsCollapsed(!statisticsCollapsed);
  };

  // Tabs are visible when viewport < 1500px (matching SPCChartWrapper logic)
  const SIDE_BY_SIDE_BREAKPOINT = 1500;
  const areTabsVisible = viewportWidth < SIDE_BY_SIDE_BREAKPOINT;

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split('-');


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Cloud Critical Dimension Hub</h1>
          <p className="text-slate-300 mt-2">
            Charting the past, present, and well-controlled future.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AppTabs activeTab="spc-dashboard" />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-black">SPC Data Dashboard</h2>

        {/* Guest Access Notice */}
        {isGuest && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Notice:</strong> Access to the SPC Dashboard is limited to the past 30 days only for guests.
              Please <a href="/register" className="text-blue-600 hover:underline">register</a> or
              <a href="/login" className="text-blue-600 hover:underline ml-1">login</a> to gain full access.
            </p>
          </div>
        )}

        {/* Dashboard Instructions */}
        <DashboardInstructions className="mb-6" />

        {/* SPC Monitor and Process-Product Tabs */}
        <div className="mb-6">
          <SPCTabs
            spcMonitor={spcMonitor}
            processProduct={processProduct}
          />
        </div>

        {/* Current Selection Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex flex-wrap gap-4 text-sm text-blue-800">
            <span><strong>SPC Monitor:</strong> {spcMonitor}</span>
            <span><strong>Process Type:</strong> {processType}</span>
            <span><strong>Product Type:</strong> {productType}</span>
          </div>
        </div>

        <FilterControls
          filters={filters}
          onFiltersChange={handleFiltersChange}
          loading={loading}
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
                {loading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-black">CD Measurement Analysis</h3>
              {areTabsVisible && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncViews}
                      onChange={(e) => setSyncViews(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${syncViews ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${syncViews ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Sync Chart Views</span>
                  </label>
                </div>
              )}
            </div>
            <div className="space-y-8">
              {/* CD ATT vs Date */}
              <SPCChartWithSharedData
                title="CD ATT vs Date"
                data={data}
                yField="cd_att"
                y2Field="duration_subseq_process_step"
                colorField="bias"
                shapeField="fake_property1"
                processType={processType}
                productType={productType}
                spcMonitor={spcMonitor}
                syncViews={syncViews}
                activeView={activeView}
                onViewChange={setActiveView}
                statisticsCollapsed={statisticsCollapsed}
                onToggleStatisticsCollapsed={toggleStatisticsCollapsed}
              />

              {/* CD X/Y vs Date */}
              <SPCChartWithSharedData
                title="CD X-Y vs Date"
                data={data}
                yField="cd_x_y"
                colorField="bias_x_y"
                processType={processType}
                productType={productType}
                spcMonitor={spcMonitor}
                syncViews={syncViews}
                activeView={activeView}
                onViewChange={setActiveView}
                statisticsCollapsed={statisticsCollapsed}
                onToggleStatisticsCollapsed={toggleStatisticsCollapsed}
              />

              {/* CD 6-Sigma vs Date */}
              <SPCChartWithSharedData
                title="CD 6-Sigma vs Date"
                data={data}
                yField="cd_6sig"
                processType={processType}
                productType={productType}
                spcMonitor={spcMonitor}
                syncViews={syncViews}
                activeView={activeView}
                onViewChange={setActiveView}
                statisticsCollapsed={statisticsCollapsed}
                onToggleStatisticsCollapsed={toggleStatisticsCollapsed}
              />
            </div>
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

function SPCDashboardContent() {
  const params = useParams();

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split('-');

  return (
    <SPCCdL1Provider
      processType={processType}
      productType={productType}
      spcMonitorName={spcMonitor}
      processProduct={processProduct}
    >
      <SPCLimitsProvider
        processType={processType}
        productType={productType}
        spcMonitorName={spcMonitor}
      >
        <SPCDashboardInner />
      </SPCLimitsProvider>
    </SPCCdL1Provider>
  );
}

export default function SPCDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SPCDashboardContent />
    </Suspense>
  );
}