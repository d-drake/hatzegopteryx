'use client';

import { useState, useMemo } from 'react';
import { SPCCdL1 } from '@/types';
import { useSPCLimits } from '@/contexts/SPCLimitsContext';

interface StatisticsTabsProps {
  data: SPCCdL1[];
  selectedEntity?: string;
}

interface EntityStats {
  entity: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  withinLimits?: boolean; // Added for control limit comparison
}

type MetricType = 'cd_att' | 'cd_x_y' | 'cd_6sig';

const calculateStats = (values: number[]): Omit<EntityStats, 'entity'> => {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };
  }

  // Sort values for median calculation
  const sorted = [...values].sort((a, b) => a - b);
  
  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  
  // Calculate standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Min and Max
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  return { mean, median, stdDev, min, max };
};

export default function StatisticsTabs({ data, selectedEntity }: StatisticsTabsProps) {
  const [activeTab, setActiveTab] = useState<MetricType>('cd_att');
  const { getLimitsForChart, isLoading: limitsLoading } = useSPCLimits();
  
  const tabs: { id: MetricType; label: string }[] = [
    { id: 'cd_att', label: 'CD ATT' },
    { id: 'cd_x_y', label: 'CD X-Y' },
    { id: 'cd_6sig', label: 'CD 6σ' },
  ];
  
  // Get SPC limits for the active chart
  const activeLimits = useMemo(() => {
    const limits = getLimitsForChart(activeTab);
    // Sort by effective date and get the most recent
    if (limits.length > 0) {
      return limits.sort((a, b) => 
        new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
      )[0];
    }
    return null;
  }, [activeTab, getLimitsForChart]);
  
  
  // Calculate statistics for the active metric
  const statistics = useMemo(() => {
    const results: EntityStats[] = [];
    
    // Get all values for the current metric (always use full data for "All" statistics)
    const allValues = data.map(d => d[activeTab]).filter(v => v != null);
    
    // Calculate "All" statistics
    if (allValues.length > 0) {
      const stats = calculateStats(allValues);
      const withinLimits = activeLimits ? 
        (activeLimits.lcl === null || activeLimits.lcl === undefined || stats.mean >= activeLimits.lcl) &&
        (activeLimits.ucl === null || activeLimits.ucl === undefined || stats.mean <= activeLimits.ucl) : 
        undefined;
      
      results.push({
        entity: 'All',
        ...stats,
        withinLimits
      });
    }
    
    // Calculate per-entity statistics
    if (selectedEntity) {
      // When an entity is selected, show only that entity
      const entityData = data.filter(d => d.entity === selectedEntity);
      const entityValues = entityData.map(d => d[activeTab]).filter(v => v != null);
      
      if (entityValues.length > 0) {
        const stats = calculateStats(entityValues);
        const withinLimits = activeLimits ? 
          (activeLimits.lcl === null || activeLimits.lcl === undefined || stats.mean >= activeLimits.lcl) &&
          (activeLimits.ucl === null || activeLimits.ucl === undefined || stats.mean <= activeLimits.ucl) : 
          undefined;
        
        results.push({
          entity: selectedEntity,
          ...stats,
          withinLimits
        });
      }
    } else {
      // When no entity is selected, show all entities
      // Get unique entities from the data dynamically
      const entities = Array.from(new Set(data.map(d => d.entity))).sort();
      
      entities.forEach(entity => {
        const entityData = data.filter(d => d.entity === entity);
        const entityValues = entityData.map(d => d[activeTab]).filter(v => v != null);
        
        if (entityValues.length > 0) {
          const stats = calculateStats(entityValues);
          const withinLimits = activeLimits ? 
            (activeLimits.lcl === null || activeLimits.lcl === undefined || stats.mean >= activeLimits.lcl) &&
            (activeLimits.ucl === null || activeLimits.ucl === undefined || stats.mean <= activeLimits.ucl) : 
            undefined;
          
          results.push({
            entity,
            ...stats,
            withinLimits
          });
        }
      });
    }
    
    return results;
  }, [data, activeTab, selectedEntity, activeLimits]);
  
  // Format number with appropriate precision
  const formatNumber = (value: number, isStdDev = false): string => {
    if (isStdDev) {
      return value.toFixed(3);
    }
    return value.toFixed(2);
  };
  
  // Check if a value is outside control limits
  const isOutsideLimits = (value: number): boolean => {
    if (!activeLimits) return false;
    
    const exceedsUCL = activeLimits.ucl !== null && activeLimits.ucl !== undefined && value > activeLimits.ucl;
    const belowLCL = activeLimits.lcl !== null && activeLimits.lcl !== undefined && value < activeLimits.lcl;
    
    return exceedsUCL || belowLCL;
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 text-black">Detailed Statistics</h2>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* SPC Control Limits */}
      {limitsLoading ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      ) : activeLimits ? (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">SPC Control Limits</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {activeLimits.ucl !== null && activeLimits.ucl !== undefined && (
              <div>
                <span className="text-gray-500">UCL:</span>
                <span className="ml-2 font-medium text-red-600">{formatNumber(activeLimits.ucl)}</span>
              </div>
            )}
            {activeLimits.cl !== null && activeLimits.cl !== undefined && (
              <div>
                <span className="text-gray-500">CL:</span>
                <span className="ml-2 font-medium text-gray-600">{formatNumber(activeLimits.cl)}</span>
              </div>
            )}
            {activeLimits.lcl !== null && activeLimits.lcl !== undefined && (
              <div>
                <span className="text-gray-500">LCL:</span>
                <span className="ml-2 font-medium text-red-600">{formatNumber(activeLimits.lcl)}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Effective:</span>
              <span className="ml-2 font-medium text-gray-600">
                {new Date(activeLimits.effective_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Statistics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mean
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Median
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Std Dev
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr key={stat.entity} className={stat.entity === 'All' ? 'bg-blue-50 font-semibold' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {stat.entity === 'All' ? 'All Entities' : stat.entity}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${
                  isOutsideLimits(stat.mean) ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatNumber(stat.mean)}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${
                  isOutsideLimits(stat.median) ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatNumber(stat.median)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatNumber(stat.stdDev, true)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatNumber(stat.min)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatNumber(stat.max)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {statistics.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No data available for statistics calculation.
          </div>
        )}
      </div>
    </div>
  );
}