'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import SPCTimeline from '@/components/spc-dashboard/SPCTimeline';
import FilterControls from '@/components/spc-dashboard/FilterControls';
import SPCTabs from '@/components/spc-dashboard/SPCTabs';
import AppTabs from '@/components/AppTabs';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';
import SPCChartWrapper from '@/components/spc-dashboard/SPCChartWrapper';
import { SPCVariabilityChart } from '@/components/spc-dashboard/SPCVariabilityChart';
import { SPCLimitsProvider } from '@/contexts/SPCLimitsContext';
import { CDDataProvider, useCDData } from '@/contexts/CDDataContext';

function SPCDashboardInner() {
  const params = useParams();
  const { 
    data, 
    isLoading: loading, 
    error, 
    filters, 
    handleFiltersChange, 
    refetch 
  } = useCDData();

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split('-');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Hatzegopteryx</h1>
          <p className="text-slate-300 mt-2">
            Fullstack application with PostgreSQL, FastAPI, and Next.js
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AppTabs activeTab="spc-dashboard" />
        </div>

        <h2 className="text-2xl font-bold mb-6">SPC Data Dashboard</h2>

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
            <h3 className="text-xl font-semibold mb-6">CD Measurement Analysis</h3>
            <div className="space-y-8">
              {/* CD ATT vs Date */}
              <SPCChartWrapper
                title="CD ATT vs Date"
                tabs={[
                  {
                    id: 'timeline',
                    label: 'Timeline',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCTimeline
                            data={data}
                            xField="date_process"
                            yField="cd_att"
                            y2Field="duration_subseq_process_step"
                            colorField="bias"
                            shapeField="fake_property1"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                            processType={processType}
                            productType={productType}
                            spcMonitorName={spcMonitor}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  },
                  {
                    id: 'variability',
                    label: 'Variability',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCVariabilityChart
                            data={data}
                            chartMeasurement="cd_att"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  }
                ]}
              />

              {/* CD X/Y vs Date */}
              <SPCChartWrapper
                title="CD X-Y vs Date"
                tabs={[
                  {
                    id: 'timeline',
                    label: 'Timeline',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCTimeline
                            data={data}
                            xField="date_process"
                            yField="cd_x_y"
                            colorField="bias_x_y"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                            processType={processType}
                            productType={productType}
                            spcMonitorName={spcMonitor}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  },
                  {
                    id: 'variability',
                    label: 'Variability',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCVariabilityChart
                            data={data}
                            chartMeasurement="cd_x_y"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  }
                ]}
              />

              {/* CD 6-Sigma vs Date */}
              <SPCChartWrapper
                title="CD 6-Sigma vs Date"
                tabs={[
                  {
                    id: 'timeline',
                    label: 'Timeline',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCTimeline
                            data={data}
                            xField="date_process"
                            yField="cd_6sig"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                            processType={processType}
                            productType={productType}
                            spcMonitorName={spcMonitor}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  },
                  {
                    id: 'variability',
                    label: 'Variability',
                    content: (
                      <ResponsiveChartWrapper>
                        {(width) => (
                          <SPCVariabilityChart
                            data={data}
                            chartMeasurement="cd_6sig"
                            width={width}
                            height={400}
                            margin={{ top: 30, right: 240, bottom: 60, left: 70 }}
                          />
                        )}
                      </ResponsiveChartWrapper>
                    )
                  }
                ]}
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
    <CDDataProvider
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
    </CDDataProvider>
  );
}

export default function SPCDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SPCDashboardContent />
    </Suspense>
  );
}