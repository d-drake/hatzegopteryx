'use client';

import { useState, useEffect } from 'react';
import { fetchEntities } from '@/services/cdDataService';
import { useAuth } from '@/contexts/AuthContext';

export interface FilterState {
  entity: string;
  startDate: string;
  endDate: string;
}

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  loading?: boolean;
}

export default function FilterControls({ 
  filters, 
  onFiltersChange, 
  loading = false 
}: FilterControlsProps) {
  const [entities, setEntities] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const { user } = useAuth();
  
  // Local state for date inputs to prevent immediate updates
  const [localStartDate, setLocalStartDate] = useState(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState(filters.endDate);
  
  const isGuest = !user;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Sync local state with parent filters
  useEffect(() => {
    setLocalStartDate(filters.startDate);
    setLocalEndDate(filters.endDate);
  }, [filters.startDate, filters.endDate]);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      const entitiesData = await fetchEntities();
      setEntities(entitiesData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    // For guests, enforce date restrictions
    if (isGuest && (key === 'startDate' || key === 'endDate')) {
      if (key === 'startDate' && value && new Date(value) < thirtyDaysAgo) {
        value = thirtyDaysAgo.toISOString().split('T')[0];
      }
      if (key === 'endDate' && value && new Date(value) > today) {
        value = today.toISOString().split('T')[0];
      }
    }
    
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateSubmit = (key: 'startDate' | 'endDate', value: string) => {
    handleFilterChange(key, value);
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
    // Only update if the value has actually changed
    if (value !== filters[key]) {
      handleDateSubmit(key, value);
    }
  };

  const clearFilters = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    onFiltersChange({
      entity: entities.length > 0 ? entities[0] : filters.entity, // Keep current entity or use first available
      startDate: '',
      endDate: ''
    });
  };

  if (loadingOptions) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
            value={filters.entity}
            onChange={(e) => handleFilterChange('entity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black"
            disabled={loading}
            required
          >
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
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            onBlur={() => handleDateBlur('startDate')}
            onKeyDown={(e) => handleDateKeyDown(e, 'startDate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black"
            disabled={loading}
            min={isGuest ? thirtyDaysAgo.toISOString().split('T')[0] : undefined}
            max={isGuest ? today.toISOString().split('T')[0] : undefined}
          />
        </div>

        {/* End Date Filter */}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black"
            disabled={loading}
            min={isGuest ? thirtyDaysAgo.toISOString().split('T')[0] : undefined}
            max={isGuest ? today.toISOString().split('T')[0] : undefined}
          />
        </div>
      </div>
    </div>
  );
}