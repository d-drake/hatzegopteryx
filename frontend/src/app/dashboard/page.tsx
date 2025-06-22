'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ScatterPlot from '@/components/charts/ScatterPlot';
import EnhancedFilterControls, { FilterState } from '@/components/dashboard/EnhancedFilterControls';
import AppTabs from '@/components/AppTabs';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CDDataItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    entity: '',
    processType: '',
    productType: '',
    spcMonitorName: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const urlFilters: FilterState = {
      entity: searchParams.get('entity') || '',
      processType: searchParams.get('processType') || '',
      productType: searchParams.get('productType') || '',
      spcMonitorName: searchParams.get('spcMonitorName') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || ''
    };
    
    // Check if we have any filters from URL
    const hasUrlFilters = Object.values(urlFilters).some(filter => filter !== '');
    
    if (hasUrlFilters) {
      setFilters(urlFilters);
    }
    
    setIsInitialized(true);
  }, [searchParams]);

  // Load data when initialized
  useEffect(() => {
    if (isInitialized) {
      const hasActiveFilters = Object.values(filters).some(filter => filter !== '');
      if (hasActiveFilters) {
        loadFilteredData();
      } else {
        loadInitialData();
      }
    }
  }, [isInitialized]);

  // Update URL and load data when filters change
  useEffect(() => {
    if (isInitialized) {
      // Update URL with new filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
      
      const queryString = params.toString();
      router.push(`/dashboard${queryString ? `?${queryString}` : ''}`);
      
      // Load data based on filters
      if (Object.values(filters).some(filter => filter !== '')) {
        loadFilteredData();
      }
    }
  }, [filters, isInitialized, router]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Calculate date 30 days ago
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const dataResponse = await fetchCDData({ 
        limit: 1000,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      });
      setData(dataResponse);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async () => {
    try {
      setLoading(true);
      const filterParams = {
        limit: 1000,
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.processType && { process_type: filters.processType }),
        ...(filters.productType && { product_type: filters.productType }),
        ...(filters.spcMonitorName && { spc_monitor_name: filters.spcMonitorName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };
      
      const dataResponse = await fetchCDData(filterParams);
      setData(dataResponse);
      setError(null);
    } catch (err) {
      setError('Failed to load filtered data');
      console.error('Error loading filtered data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({
      entity: '',
      processType: '',
      productType: '',
      spcMonitorName: '',
      startDate: '',
      endDate: ''
    });
    router.push('/dashboard');
    loadInitialData();
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
          <AppTabs activeTab="dashboard" />
        </div>

        <h2 className="text-2xl font-bold mb-6">SPC Data Dashboard</h2>
        
        <EnhancedFilterControls
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
            {error}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-6">CD Measurement Analysis</h3>
            <div className="space-y-8">
              {/* CD ATT vs Date */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center">CD ATT vs Date</h4>
                <ScatterPlot
                  data={data}
                  xField="date_process"
                  yField="cd_att"
                  colorField="bias"
                  shapeField="fake_property1"
                  width={800}
                  height={400}
                  margin={{ top: 20, right: 150, bottom: 60, left: 70 }}
                />
              </div>

              {/* CD X/Y vs Date */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center">CD X/Y vs Date</h4>
                <ScatterPlot
                  data={data}
                  xField="date_process"
                  yField="cd_x_y"
                  colorField="bias_x_y"
                  width={800}
                  height={400}
                  margin={{ top: 20, right: 150, bottom: 60, left: 70 }}
                />
              </div>

              {/* CD 6-Sigma vs Date */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="text-lg font-medium mb-3 text-center">CD 6-Sigma vs Date</h4>
                <ScatterPlot
                  data={data}
                  xField="date_process"
                  yField="cd_6sig"
                  width={800}
                  height={400}
                  margin={{ top: 20, right: 150, bottom: 60, left: 70 }}
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