'use client';

import { useState, useEffect } from 'react';
import { 
  fetchEntities, 
  fetchProcessTypes, 
  fetchProductTypes, 
  fetchSPCMonitorNames 
} from '@/services/cdDataService';

export interface FilterState {
  entity: string;
  processType: string;
  productType: string;
  spcMonitorName: string;
  startDate: string;
  endDate: string;
}

interface EnhancedFilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  loading?: boolean;
}

export default function EnhancedFilterControls({ 
  filters, 
  onFiltersChange, 
  loading = false 
}: EnhancedFilterControlsProps) {
  const [entities, setEntities] = useState<string[]>([]);
  const [processTypes, setProcessTypes] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [spcMonitorNames, setSpcMonitorNames] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      const [entitiesData, processTypesData, productTypesData, spcMonitorNamesData] = 
        await Promise.all([
          fetchEntities(),
          fetchProcessTypes(),
          fetchProductTypes(),
          fetchSPCMonitorNames()
        ]);
      
      setEntities(entitiesData);
      setProcessTypes(processTypesData);
      setProductTypes(productTypesData);
      setSpcMonitorNames(spcMonitorNamesData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      entity: '',
      processType: '',
      productType: '',
      spcMonitorName: '',
      startDate: '',
      endDate: ''
    });
  };

  if (loadingOptions) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Data Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
          disabled={loading}
        >
          Clear All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Entity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity
          </label>
          <select
            value={filters.entity}
            onChange={(e) => handleFilterChange('entity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
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

        {/* Process Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Process Type
          </label>
          <select
            value={filters.processType}
            onChange={(e) => handleFilterChange('processType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          >
            <option value="">All Process Types</option>
            {processTypes.map((processType) => (
              <option key={processType} value={processType}>
                {processType}
              </option>
            ))}
          </select>
        </div>

        {/* Product Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Type
          </label>
          <select
            value={filters.productType}
            onChange={(e) => handleFilterChange('productType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          >
            <option value="">All Product Types</option>
            {productTypes.map((productType) => (
              <option key={productType} value={productType}>
                {productType}
              </option>
            ))}
          </select>
        </div>

        {/* SPC Monitor Name Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SPC Monitor
          </label>
          <select
            value={filters.spcMonitorName}
            onChange={(e) => handleFilterChange('spcMonitorName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          >
            <option value="">All Monitors</option>
            {spcMonitorNames.map((monitorName) => (
              <option key={monitorName} value={monitorName}>
                {monitorName}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.values(filters).some(filter => filter !== '') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {Object.entries(filters).map(([key, value]) => 
              value && (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {key}: {value}
                  <button
                    type="button"
                    className="ml-1 inline-flex h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                    onClick={() => handleFilterChange(key as keyof FilterState, '')}
                  >
                    <span className="sr-only">Remove filter</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}