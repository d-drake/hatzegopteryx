'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CDData, CDDataStats } from '@/types';
import { cdDataApi } from '@/lib/api';
import Header from '@/components/auth/Header';
import AppTabs from '@/components/AppTabs';
import { useAuth } from '@/contexts/AuthContext';

export default function SPCAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const spcMonitor = params.spcMonitor as string;
  const processProduct = params.processProduct as string;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct ? processProduct.split('-') : ['', ''];

  const [cdData, setCdData] = useState<CDData[]>([]);
  const [stats, setStats] = useState<CDDataStats | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get filter values from URL
  const selectedEntity = searchParams.get('entity') || '';
  const urlStartDate = searchParams.get('startDate') || '';
  const urlEndDate = searchParams.get('endDate') || '';
  
  // Local state for date inputs to prevent immediate updates
  const [localStartDate, setLocalStartDate] = useState(urlStartDate);
  const [localEndDate, setLocalEndDate] = useState(urlEndDate);

  // Calculate date restrictions for guests
  const isGuest = !user;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // For guests, enforce 30-day limit
  const getEffectiveStartDate = () => {
    if (isGuest) {
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      if (!urlStartDate || new Date(urlStartDate) < thirtyDaysAgo) {
        return thirtyDaysAgoStr;
      }
    }
    return urlStartDate;
  };

  const getEffectiveEndDate = () => {
    if (isGuest) {
      const todayStr = today.toISOString().split('T')[0];
      if (!urlEndDate || new Date(urlEndDate) > today) {
        return todayStr;
      }
    }
    return urlEndDate;
  };

  const startDate = getEffectiveStartDate();
  const endDate = getEffectiveEndDate();

  const fetchCDData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 50,
        spc_monitor_name: spcMonitor,
        process_type: processType,
        product_type: productType,
        ...(selectedEntity && { entity: selectedEntity }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };
      const data = await cdDataApi.getAll(params);
      setCdData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch CD data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [spcMonitor, processType, productType, selectedEntity, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    try {
      const params = {
        spc_monitor_name: spcMonitor,
        process_type: processType,
        product_type: productType,
        ...(selectedEntity && { entity: selectedEntity }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };
      const statsData = await cdDataApi.getStats(params);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [spcMonitor, processType, productType, selectedEntity, startDate, endDate]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [entitiesData] = await Promise.all([
        cdDataApi.getEntities(),
      ]);
      setEntities(entitiesData);
      await fetchCDData();
      await fetchStats();
    } catch (err) {
      setError('Failed to fetch initial data');
      console.error(err);
    }
  }, [fetchCDData, fetchStats]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchCDData();
    fetchStats();
  }, [selectedEntity, startDate, endDate, fetchCDData, fetchStats]);

  // Sync local state with URL parameters
  useEffect(() => {
    setLocalStartDate(urlStartDate);
    setLocalEndDate(urlEndDate);
  }, [urlStartDate, urlEndDate]);

  const updateFilters = (newEntity: string, newStartDate: string, newEndDate: string) => {
    const params = new URLSearchParams();
    if (newEntity) params.set('entity', newEntity);
    if (newStartDate) params.set('startDate', newStartDate);
    if (newEndDate) params.set('endDate', newEndDate);

    router.push(`/spc-analytics/${spcMonitor}/${processProduct}?${params.toString()}`);
  };

  const handleEntityChange = (value: string) => {
    updateFilters(value, startDate, endDate);
  };

  const handleDateSubmit = (key: 'startDate' | 'endDate', value: string) => {
    // For guests, enforce date restrictions
    if (isGuest) {
      if (key === 'startDate' && value && new Date(value) < thirtyDaysAgo) {
        value = thirtyDaysAgo.toISOString().split('T')[0];
      }
      if (key === 'endDate' && value && new Date(value) > today) {
        value = today.toISOString().split('T')[0];
      }
    }
    
    if (key === 'startDate') {
      updateFilters(selectedEntity, value, endDate);
    } else {
      updateFilters(selectedEntity, startDate, value);
    }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: 'startDate' | 'endDate') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = key === 'startDate' ? localStartDate : localEndDate;
      handleDateSubmit(key, value);
    }
  };

  const handleDateBlur = (key: 'startDate' | 'endDate') => {
    const value = key === 'startDate' ? localStartDate : localEndDate;
    const currentValue = key === 'startDate' ? startDate : endDate;
    // Only update if the value has actually changed
    if (value !== currentValue) {
      handleDateSubmit(key, value);
    }
  };

  const clearFilters = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    router.push(`/spc-analytics/${spcMonitor}/${processProduct}`);
  };

  if (loading && !cdData.length) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">Data Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity
                </label>
                <select
                  value={selectedEntity}
                  onChange={(e) => handleEntityChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Entities</option>
                  {entities.map((entity) => (
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
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  onBlur={() => handleDateBlur('startDate')}
                  onKeyDown={(e) => handleDateKeyDown(e, 'startDate')}
                  min={isGuest ? thirtyDaysAgo.toISOString().split('T')[0] : undefined}
                  max={isGuest ? today.toISOString().split('T')[0] : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  onBlur={() => handleDateBlur('endDate')}
                  onKeyDown={(e) => handleDateKeyDown(e, 'endDate')}
                  min={isGuest ? thirtyDaysAgo.toISOString().split('T')[0] : undefined}
                  max={isGuest ? today.toISOString().split('T')[0] : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.total_count.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.avg_cd_att.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Avg CD ATT (nm)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.avg_cd_6sig.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Avg CD 6σ (nm)</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-600">
                    {stats.min_cd_att.toFixed(1)} / {stats.max_cd_att.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-600">CD ATT Range</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">CD Data</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DateTime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bias
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CD ATT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CD 6σ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Process/Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cdData.map((row) => (
                    <tr key={row.lot} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(row.date_process).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.entity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.bias} / {row.bias_x_y}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={row.cd_att > 0 ? 'text-red-600' : 'text-blue-600'}>
                          {row.cd_att.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.cd_6sig.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>{row.process_type} / {row.product_type}</div>
                          <div className="text-gray-500">{row.spc_monitor_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        P1: {row.fake_property1} / P2: {row.fake_property2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cdData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No CD data found with the current filters.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}