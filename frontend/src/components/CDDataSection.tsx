'use client';

import { useState, useEffect } from 'react';
import { CDData, CDDataStats } from '@/types';
import { cdDataApi } from '@/lib/api';

export default function CDDataSection() {
  const [cdData, setCdData] = useState<CDData[]>([]);
  const [stats, setStats] = useState<CDDataStats | null>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCDData();
    fetchStats();
  }, [selectedEntity, startDate, endDate]);

  const fetchInitialData = async () => {
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
  };

  const fetchCDData = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 50,
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
  };

  const fetchStats = async () => {
    try {
      const params = {
        ...(selectedEntity && { entity: selectedEntity }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      };
      const statsData = await cdDataApi.getStats(params);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const clearFilters = () => {
    setSelectedEntity('');
    setStartDate('');
    setEndDate('');
  };

  if (loading && !cdData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
          <h2 className="text-lg font-semibold mb-4">Statistics</h2>
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
          <h2 className="text-lg font-semibold">CD Data (Latest 50 records)</h2>
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
  );
}