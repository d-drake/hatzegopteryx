'use client';

import { useEffect, useState } from 'react';
import ScatterPlot from '@/components/charts/ScatterPlot';
import FilterControls from '@/components/dashboard/FilterControls';
import AppTabs from '@/components/AppTabs';
import { fetchCDData, fetchEntities, CDDataItem } from '@/services/cdDataService';

export default function DashboardPage() {
  const [data, setData] = useState<CDDataItem[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedEntity || dateRange.start || dateRange.end) {
      loadFilteredData();
    }
  }, [selectedEntity, dateRange]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dataResponse, entitiesResponse] = await Promise.all([
        fetchCDData(),
        fetchEntities(),
      ]);
      setData(dataResponse);
      setEntities(entitiesResponse);
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
      const filteredData = await fetchCDData({
        entity: selectedEntity,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setData(filteredData);
      setError(null);
    } catch (err) {
      setError('Failed to load filtered data');
      console.error('Error loading filtered data:', err);
    } finally {
      setLoading(false);
    }
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
        
        <FilterControls
          entities={entities}
          selectedEntity={selectedEntity}
          onEntityChange={setSelectedEntity}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
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
                  xField="datetime"
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
                  xField="datetime"
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
                  xField="datetime"
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