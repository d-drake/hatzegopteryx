'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import SPCTimeline from '@/components/spc-dashboard/SPCTimeline';
import FilterControls, { FilterState } from '@/components/spc-dashboard/FilterControls';
import SPCTabs from '@/components/spc-dashboard/SPCTabs';
import AppTabs from '@/components/AppTabs';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';

function SPCDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split(/[-_]/); // Support both - and _ separators

  const [data, setData] = useState<CDDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create default filters for query string parameters only
  const getDefaultFilters = (): FilterState => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      entity: 'FAKE_TOOL1',
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  };

  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());

  const loadFilteredData = useCallback(async () => {
    try {
      setLoading(true);
      const filterParams = {
        limit: 1000,
        // URL path parameters
        process_type: processType,
        product_type: productType,
        spc_monitor_name: spcMonitor,
        // Query string parameters
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      const dataResponse = await fetchCDData(filterParams);
      setData(dataResponse);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error && err.message.includes('JSON')
        ? 'Connection issue detected. Please refresh the page to try again.'
        : 'Failed to load filtered data. Please try again.';
      setError(errorMessage);
      console.error('Error loading filtered data:', err);
    } finally {
      setLoading(false);
    }
  }, [spcMonitor, processType, productType, filters]);

  // Initialize filters from URL query params on mount
  useEffect(() => {
    const urlFilters: FilterState = {
      entity: searchParams.get('entity') || 'FAKE_TOOL1', // Always ensure entity has a value
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || ''
    };

    // Check if we have any non-entity filters from URL
    const hasUrlFilters = urlFilters.startDate !== '' || urlFilters.endDate !== '';

    if (hasUrlFilters) {
      setFilters(urlFilters);
    } else {
      // If no URL filters, use defaults (which are already set in useState)
      setFilters(getDefaultFilters());
    }

    setIsInitialized(true);
  }, [searchParams]);

  // Load data when initialized or when URL path parameters change
  useEffect(() => {
    if (isInitialized && spcMonitor && processType && productType) {
      loadFilteredData();
    }
  }, [isInitialized, spcMonitor, processType, productType, loadFilteredData]);

  // Update URL query string when filters change
  useEffect(() => {
    if (isInitialized) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      const newUrl = `/spc-dashboard/${encodeURIComponent(spcMonitor)}/${encodeURIComponent(processProduct)}${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl);
    }
  }, [filters, isInitialized, spcMonitor, processProduct, router]);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      entity: '',
      startDate: '',
      endDate: ''
    });
  };

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
                onClick={() => loadFilteredData()}
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
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center text-black">CD ATT vs Date</h4>
                <SPCTimeline
                  data={data}
                  xField="date_process"
                  yField="cd_att"
                  y2Field="duration_subseq_process_step"
                  colorField="bias"
                  shapeField="fake_property1"
                  width={800}
                  height={400}
                  margin={{ top: 60, right: 200, bottom: 60, left: 70 }}
                  processType={processType}
                  productType={productType}
                  spcMonitorName={spcMonitor}
                />
              </div>

              {/* CD X/Y vs Date */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center text-black">CD X-Y vs Date</h4>
                <SPCTimeline
                  data={data}
                  xField="date_process"
                  yField="cd_x_y"
                  colorField="bias_x_y"
                  width={800}
                  height={400}
                  margin={{ top: 60, right: 200, bottom: 60, left: 70 }}
                  processType={processType}
                  productType={productType}
                  spcMonitorName={spcMonitor}
                />
              </div>

              {/* CD 6-Sigma vs Date */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center text-black">CD 6-Sigma vs Date</h4>
                <SPCTimeline
                  data={data}
                  xField="date_process"
                  yField="cd_6sig"
                  width={800}
                  height={400}
                  margin={{ top: 60, right: 200, bottom: 60, left: 70 }}
                  processType={processType}
                  productType={productType}
                  spcMonitorName={spcMonitor}
                />
              </div>
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

export default function SPCDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SPCDashboardContent />
    </Suspense>
  );
}