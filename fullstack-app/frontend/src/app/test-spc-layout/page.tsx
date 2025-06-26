'use client';

import { useState, useEffect } from 'react';
import SPCChartLayout from '@/components/spc-dashboard/SPCChartLayout';
import SPCTimeline from '@/components/spc-dashboard/SPCTimeline';
import SPCVariabilityChart from '@/components/spc-dashboard/SPCVariabilityChart';
import { useSharedYScale } from '@/hooks/useSharedYScale';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';

export default function TestSPCLayout() {
  const [data, setData] = useState<CDDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Test filters
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetchCDData({
          limit: 200,
          process_type: '1000',
          product_type: 'BNT44',
          spc_monitor_name: 'SPC_CD_L1'
        });
        setData(response);
        setError(null);
      } catch (err) {
        setError('Failed to load test data');
        console.error('Error loading test data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Create shared Y-axis scale for CD ATT field
  const sharedYScale = useSharedYScale(data, data, 'cd_att', 450);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Loading test data...</div>
          <div className="text-sm text-gray-500 mt-2">Testing SPC responsive layout</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="font-bold">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // Create Timeline component
  const timelineComponent = (
    <SPCTimeline
      data={data}
      xField="date_process"
      yField="cd_att"
      y2Field="duration_subseq_process_step"
      colorField="bias"
      shapeField="fake_property1"
      yScale={sharedYScale}
      processType="1000"
      productType="BNT44"
      spcMonitorName="SPC_CD_L1"
    />
  );

  // Create Variability component
  const variabilityComponent = (
    <SPCVariabilityChart
      data={data}
      yField="cd_att"
      startDate={startDate}
      endDate={endDate}
      yScale={sharedYScale}
      width={400}
      height={450}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">SPC Layout Test</h1>
          <p className="text-slate-300 mt-2">
            Testing responsive layout: side-by-side on desktop (≥1024px), tabs on mobile
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">CD ATT Analysis Test</h2>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="text-sm text-blue-800">
              <strong>Test Configuration:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Data: {data.length} CD measurements</li>
                <li>• Y-field: cd_att (shared Y-scale)</li>
                <li>• Timeline: All entities with time-based filtering</li>
                <li>• Variability: All entities, date-range filtered only</li>
                <li>• Layout: Responsive (1024px breakpoint)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test the responsive layout */}
        <SPCChartLayout
          timelineComponent={timelineComponent}
          variabilityComponent={variabilityComponent}
        />

        {/* Layout debugging info */}
        <div className="mt-8 bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Layout Testing Guide</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Desktop (≥1024px):</strong> Should show Timeline (60%) and Variability (40%) side-by-side</p>
            <p><strong>Mobile/Tablet (&lt;1024px):</strong> Should show tabs with Timeline and Variability options</p>
            <p><strong>Shared Y-Scale:</strong> Both charts should have the same Y-axis range for cd_att</p>
            <p><strong>Tab State:</strong> Tab selection should persist in sessionStorage</p>
          </div>
        </div>
      </main>
    </div>
  );
}