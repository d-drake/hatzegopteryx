'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { SPCCdL1, SPCCdL1Stats } from '@/types';
import { spcCdL1Api } from '@/lib/api';
import Header from '@/components/auth/Header';
import AppTabs from '@/components/AppTabs';
import SPCTabs from '@/components/spc-dashboard/SPCTabs';
import { useAuth } from '@/contexts/AuthContext';
import { SPCCdL1Provider, useSPCCdL1 } from '@/contexts/SPCCdL1Context';
import { SPCLimitsProvider } from '@/contexts/SPCLimitsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DatePicker } from '@/components/ui/date-picker';
import StatisticsTabs from '@/components/spc-analytics/StatisticsTabs';

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
    handleFiltersChange
  } = useSPCCdL1();

  const spcMonitor = params.spcMonitor as string;
  const processProduct = params.processProduct as string;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct ? processProduct.split('-') : ['', ''];

  // Local state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [localData, setLocalData] = useState<SPCCdL1[]>([]);
  const [stats, setStats] = useState<SPCCdL1Stats | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Independent entity filter for Analytics (not synced with context)
  const [localSelectedEntity, setLocalSelectedEntity] = useState<string>('');

  // Initialize local entity from URL on mount (independent from context)
  useEffect(() => {
    const urlEntity = searchParams.get('analyticsEntity') || '';
    setLocalSelectedEntity(urlEntity);
  }, [searchParams]);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'date_process' | 'entity' | 'bias' | 'bias_x_y' | 'cd_att' | 'cd_x_y' | 'cd_6sig'>('date_process');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const pageSize = 50;

  // Calculate date restrictions and defaults
  const isGuest = !user;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Use only date filters from context, entity is independent
  const startDate = contextFilters.startDate;
  const endDate = contextFilters.endDate;

  // Local state for date inputs to prevent immediate updates
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Sync local date state with context filters (but not entity)
  useEffect(() => {
    setLocalStartDate(contextFilters.startDate);
    setLocalEndDate(contextFilters.endDate);
  }, [contextFilters.startDate, contextFilters.endDate]);

  // For guests, enforce 30-day limit
  const getEffectiveStartDate = () => {
    if (isGuest) {
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      if (!startDate || new Date(startDate) < thirtyDaysAgo) {
        return thirtyDaysAgoStr;
      }
    }
    return startDate;
  };

  const getEffectiveEndDate = () => {
    if (isGuest) {
      const todayStr = today.toISOString().split('T')[0];
      if (!endDate || new Date(endDate) > today) {
        return todayStr;
      }
    }
    return endDate;
  };

  // Calculate pagination from all entity data (using allEntityData like SPCVariabilityChart)
  const dataForAnalytics = allEntityData.length > 0 ? allEntityData : contextData;
  const filteredDataLength = localSelectedEntity
    ? dataForAnalytics.filter(d => d.entity === localSelectedEntity).length
    : dataForAnalytics.length;
  const totalPages = Math.ceil(filteredDataLength / pageSize);
  const hasMoreInContext = currentPage < totalPages;
  const needsServerFetch = currentPage > totalPages && dataForAnalytics.length === 1000;

  // Sort data function
  const sortData = useCallback((data: SPCCdL1[]) => {
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'date_process':
          aValue = new Date(a.date_process).getTime();
          bValue = new Date(b.date_process).getTime();
          break;
        case 'entity':
          aValue = a.entity;
          bValue = b.entity;
          break;
        case 'bias':
          aValue = a.bias;
          bValue = b.bias;
          break;
        case 'bias_x_y':
          aValue = a.bias_x_y;
          bValue = b.bias_x_y;
          break;
        case 'cd_att':
          aValue = a.cd_att;
          bValue = b.cd_att;
          break;
        case 'cd_x_y':
          aValue = a.cd_x_y;
          bValue = b.cd_x_y;
          break;
        case 'cd_6sig':
          aValue = a.cd_6sig;
          bValue = b.cd_6sig;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [sortColumn, sortDirection]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    // Use all entity data for Analytics (similar to SPCVariabilityChart)
    const baseData = dataForAnalytics;

    // Apply client-side entity filter for display purposes
    const filteredData = localSelectedEntity
      ? baseData.filter(d => d.entity === localSelectedEntity)
      : baseData;

    // Sort the filtered data
    const sortedData = sortData(filteredData);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // If we have enough data in context, use it
    if (startIndex < sortedData.length) {
      return sortedData.slice(startIndex, endIndex);
    }

    // Otherwise return empty array (will trigger server fetch if needed)
    return [];
  }, [dataForAnalytics, currentPage, pageSize, localSelectedEntity, sortData]);

  // Update local data when context data or page changes
  useEffect(() => {
    const pageData = getCurrentPageData();
    setLocalData(pageData);
  }, [getCurrentPageData]);

  // Fetch additional data from server if needed
  const fetchAdditionalData = useCallback(async (page: number) => {
    if (!needsServerFetch) return;

    try {
      setLoading(true);
      const skipAmount = (page - 1) * pageSize;
      const params = {
        limit: pageSize,
        skip: skipAmount,
        spc_monitor_name: spcMonitor,
        process_type: processType,
        product_type: productType,
        // Note: NOT filtering by entity as requested
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };
      const data = await spcCdL1Api.getAll(params);

      setLocalData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch additional data');
      console.error(err);

      // Track error in Sentry
      Sentry.captureException(err, {
        tags: {
          component: 'SPCAnalytics',
          action: 'fetchAdditionalData'
        },
        extra: {
          page: page,
          spcMonitor,
          processType,
          productType,
          skipAmount: (page - 1) * pageSize
        }
      });
    } finally {
      setLoading(false);
    }
  }, [needsServerFetch, spcMonitor, processType, productType, startDate, endDate, pageSize]);

  // Calculate stats from all entity data
  const calculateStats = useCallback(() => {
    // Use all entity data for Analytics
    const baseData = dataForAnalytics;

    // Apply client-side entity filter for stats calculation
    const dataForStats = localSelectedEntity
      ? baseData.filter(d => d.entity === localSelectedEntity)
      : baseData;

    if (dataForStats.length === 0) {
      setStats(null);
      return;
    }

    const cdAttValues = dataForStats.map(d => d.cd_att).filter(v => v != null);
    const cd6sigValues = dataForStats.map(d => d.cd_6sig).filter(v => v != null);

    setStats({
      total_count: dataForStats.length,
      avg_cd_att: cdAttValues.reduce((a, b) => a + b, 0) / cdAttValues.length,
      avg_cd_6sig: cd6sigValues.reduce((a, b) => a + b, 0) / cd6sigValues.length,
      min_cd_att: Math.min(...cdAttValues),
      max_cd_att: Math.max(...cdAttValues),
      entity_count: new Set(dataForStats.map(d => d.entity)).size
    });
  }, [dataForAnalytics, localSelectedEntity]);

  // Load entities from all entity data
  useEffect(() => {
    const uniqueEntities = Array.from(new Set(dataForAnalytics.map(d => d.entity))).sort();
    setEntities(uniqueEntities);
  }, [dataForAnalytics]);

  // Calculate stats when context data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Fetch additional data if we're beyond context data
  useEffect(() => {
    if (needsServerFetch && currentPage > totalPages) {
      fetchAdditionalData(currentPage);
    }
  }, [needsServerFetch, currentPage, totalPages, fetchAdditionalData]);


  const handleEntityChange = (value: string) => {

    // SPC Analytics has independent entity filter
    setLocalSelectedEntity(value);
    // Reset to first page when filters change
    setCurrentPage(1);

    // Update URL with analytics-specific entity parameter
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('analyticsEntity', value);
    } else {
      params.delete('analyticsEntity');
    }

    const newUrl = `/spc-analytics/${encodeURIComponent(spcMonitor)}/${encodeURIComponent(processProduct)}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {

    // Update local state
    if (key === 'startDate') {
      setLocalStartDate(value);
    } else {
      setLocalEndDate(value);
    }

    // For guests, enforce date restrictions
    if (isGuest) {
      if (key === 'startDate' && value && new Date(value) < thirtyDaysAgo) {
        value = thirtyDaysAgo.toISOString().split('T')[0];
      }
      if (key === 'endDate' && value && new Date(value) > today) {
        value = today.toISOString().split('T')[0];
      }
    }

    // Update context filters
    handleFiltersChange({
      ...contextFilters,
      [key]: value
    });
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalSelectedEntity(''); // Reset local entity filter
    handleFiltersChange({
      ...contextFilters,
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  const handleSort = (column: 'date_process' | 'entity' | 'bias' | 'bias_x_y' | 'cd_att' | 'cd_x_y' | 'cd_6sig') => {
    if (column === sortColumn) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default ascending order (except for date which defaults to descending)
      setSortColumn(column);
      setSortDirection(column === 'date_process' ? 'desc' : 'asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // Calculate if there are more pages available
  const hasMore = hasMoreInContext || (contextData.length === 1000 && needsServerFetch);

  // Show loading only for initial context load
  if (contextLoading && dataForAnalytics.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Calculate display offset for pagination
  const offset = (currentPage - 1) * pageSize;

  // Calculate the total records to display accurately
  const totalDisplayRecords = localSelectedEntity
    ? dataForAnalytics.filter(d => d.entity === localSelectedEntity).length
    : dataForAnalytics.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Cloud Critical Dimension Hub</h1>
          <p className="text-slate-300 mt-2">
            SPC Analytics - {spcMonitor} / {processType}-{productType}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <AppTabs />
        </div>

        <h2 className="text-2xl font-bold mb-6 text-black">SPC Analytics</h2>

        {/* Guest Access Notice */}
        {isGuest && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Notice:</strong> Access to the SPC Analytics is limited to the past 30 days only for guests.
              Please <a href="/register" className="text-blue-600 hover:underline">register</a> or
              <a href="/login" className="text-blue-600 hover:underline ml-1">login</a> to gain full access.
            </p>
          </div>
        )}

        {/* SPC Monitor and Process-Product Tabs */}
        <div className="mb-6">
          <SPCTabs
            spcMonitor={spcMonitor}
            processProduct={processProduct}
            basePath="/spc-analytics"
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

        <div className="space-y-6">
          {(error || contextError) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error || contextError}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Data Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
                disabled={loading}
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Entity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity
                </label>
                <select
                  value={localSelectedEntity}
                  onChange={(e) => handleEntityChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat"
                  disabled={loading}
                >
                  <option value="">All Entities</option>
                  {entities.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <DatePicker
                  value={localStartDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  disabled={loading}
                  minDate={isGuest ? thirtyDaysAgo : undefined}
                  maxDate={isGuest ? today : undefined}
                  placeholder="Select start date"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <DatePicker
                  value={localEndDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  disabled={loading}
                  minDate={isGuest ? thirtyDaysAgo : undefined}
                  maxDate={isGuest ? today : undefined}
                  placeholder="Select end date"
                />
              </div>
            </div>
          </div>

          {/* Statistics */}
          <StatisticsTabs
            data={dataForAnalytics}
            selectedEntity={localSelectedEntity}
          />

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-black">Selected Data</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loading}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Showing {offset + 1}-{Math.min(offset + pageSize, totalDisplayRecords)} of {totalDisplayRecords}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || loading}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${!hasMore || loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('date_process')}
                    >
                      <div className="flex items-center gap-1">
                        DateTime
                        {sortColumn === 'date_process' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('entity')}
                    >
                      <div className="flex items-center gap-1">
                        Entity
                        {sortColumn === 'entity' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('bias')}
                    >
                      <div className="flex items-center gap-1">
                        Bias
                        {sortColumn === 'bias' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('bias_x_y')}
                    >
                      <div className="flex items-center gap-1">
                        Bias X-Y
                        {sortColumn === 'bias_x_y' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('cd_att')}
                    >
                      <div className="flex items-center gap-1">
                        CD ATT
                        {sortColumn === 'cd_att' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('cd_x_y')}
                    >
                      <div className="flex items-center gap-1">
                        CD X-Y
                        {sortColumn === 'cd_x_y' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort('cd_6sig')}
                    >
                      <div className="flex items-center gap-1">
                        <span className="uppercase">CD 6</span>σ
                        {sortColumn === 'cd_6sig' && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            {sortDirection === 'asc' ? (
                              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localData.map((row) => (
                    <tr key={row.lot} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(row.date_process).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.entity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.bias}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.bias_x_y}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.cd_att.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.cd_x_y.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.cd_6sig.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        P1: {row.fake_property1} / P2: {row.fake_property2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {localData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No CD data found with the current filters.
              </div>
            )}

            {/* Bottom pagination controls */}
            {localData.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                    className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 || loading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Showing {offset + 1}-{Math.min(offset + pageSize, totalDisplayRecords)} of {totalDisplayRecords}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasMore || loading}
                    className={`flex items-center gap-1 px-3 py-1 rounded ${!hasMore || loading
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SPCAnalyticsPage() {
  const params = useParams();

  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split('-');

  return (
    <ErrorBoundary errorMessage="Unable to load SPC Analytics">
      <SPCCdL1Provider
        processType={processType}
        productType={productType}
        spcMonitorName={spcMonitor}
        processProduct={processProduct}
      >
        <SPCLimitsProvider
          processType={processType}
          productType={productType}
          spcMonitor={spcMonitor}
        >
          <SPCAnalyticsInner />
        </SPCLimitsProvider>
      </SPCCdL1Provider>
    </ErrorBoundary>
  );
}