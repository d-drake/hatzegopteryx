'use client';

import { useState, useEffect } from 'react';
import VariabilityChart from '@/components/charts/VariabilityChart';
import { CDData } from '@/types';
import { cdDataApi } from '@/lib/api';

interface SPCVariabilityDashboardProps {
  spcMonitor: string;
  processProduct: string;
}

export default function SPCVariabilityDashboard({ 
  spcMonitor, 
  processProduct 
}: SPCVariabilityDashboardProps) {
  const [cdData, setCdData] = useState<CDData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [processType, productType] = processProduct.split('-');
        
        const params = {
          spc_monitor_name: decodeURIComponent(spcMonitor),
          process_type: processType,
          product_type: productType,
          limit: 1000, // Get more data for better statistical analysis
          ...(selectedEntity && { entity: selectedEntity }),
        };
        
        const data = await cdDataApi.getAll(params);
        setCdData(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch SPC data for variability analysis');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spcMonitor, processProduct, selectedEntity]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading variability data...</span>
      </div>
    );
  }

  if (error || cdData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800">
          {error || 'No data available for variability analysis'}
        </p>
      </div>
    );
  }

  // Get unique entities for filtering
  const entities = Array.from(new Set(cdData.map(d => d.entity))).sort();

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Variability Analysis Filters</h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Filter
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Entities ({entities.length})</option>
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSelectedEntity('')}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Dataset Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{cdData.length}</p>
            <p className="text-sm text-gray-600">Total Measurements</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{entities.length}</p>
            <p className="text-sm text-gray-600">Manufacturing Entities</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {spcMonitor.replace(/_/g, ' ')}
            </p>
            <p className="text-sm text-gray-600">SPC Monitor</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {processProduct.replace(/-/g, ' / ')}
            </p>
            <p className="text-sm text-gray-600">Process/Product</p>
          </div>
        </div>
      </div>

      {/* Variability Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CD ATT Variability by Entity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Box plot showing distribution of Critical Dimension ATT measurements across manufacturing entities
          </p>
          <VariabilityChart
            data={cdData}
            yField="cd_att"
            groupField="entity"
            width={600}
            height={400}
            margin={{ top: 20, right: 150, bottom: 80, left: 80 }}
            outlierThreshold={1.5}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CD 6σ Variability by Entity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Box plot showing distribution of Critical Dimension 6-sigma measurements across manufacturing entities
          </p>
          <VariabilityChart
            data={cdData}
            yField="cd_6sig"
            groupField="entity"
            width={600}
            height={400}
            margin={{ top: 20, right: 150, bottom: 80, left: 80 }}
            outlierThreshold={1.5}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CD X-Y Variability by Entity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Box plot showing distribution of Critical Dimension X-Y measurements across manufacturing entities
          </p>
          <VariabilityChart
            data={cdData}
            yField="cd_x_y"
            groupField="entity"
            width={600}
            height={400}
            margin={{ top: 20, right: 150, bottom: 80, left: 80 }}
            outlierThreshold={1.5}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Bias Variability by Entity</h3>
          <p className="text-sm text-gray-600 mb-4">
            Box plot showing distribution of process bias measurements across manufacturing entities
          </p>
          <VariabilityChart
            data={cdData}
            yField="bias"
            groupField="entity"
            width={600}
            height={400}
            margin={{ top: 20, right: 150, bottom: 80, left: 80 }}
            outlierThreshold={1.5}
          />
        </div>
      </div>

      {/* Manufacturing Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">Manufacturing Process Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-semibold mb-2">Box Plot Elements:</h4>
            <ul className="space-y-1">
              <li>• <strong>Blue Box:</strong> Interquartile range (Q1 to Q3)</li>
              <li>• <strong>Dark Blue Line:</strong> Median value</li>
              <li>• <strong>Orange Diamond:</strong> Mean value</li>
              <li>• <strong>Dashed Lines:</strong> Whiskers (min/max non-outliers)</li>
              <li>• <strong>Red Circles:</strong> Outlier measurements</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Quality Control Indicators:</h4>
            <ul className="space-y-1">
              <li>• <strong>Tight Distribution:</strong> Consistent process control</li>
              <li>• <strong>Wide Distribution:</strong> Process variability issues</li>
              <li>• <strong>Many Outliers:</strong> Process instability</li>
              <li>• <strong>Skewed Distribution:</strong> Systematic bias</li>
              <li>• <strong>Entity Differences:</strong> Tool-specific performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}