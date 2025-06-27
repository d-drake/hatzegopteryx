'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchCDData, CDDataItem } from '@/services/cdDataService';
import { FilterState } from '@/components/spc-dashboard/FilterControls';

interface CDDataContextValue {
  data: CDDataItem[];
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  isInitialized: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
}

const CDDataContext = createContext<CDDataContextValue | null>(null);

interface CDDataProviderProps {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
  processProduct: string;
}

export function CDDataProvider({ 
  children, 
  processType, 
  productType, 
  spcMonitorName,
  processProduct
}: CDDataProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<CDDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create default filters
  const getDefaultFilters = (): FilterState => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      entity: 'FAKE_TOOL1',
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  };

  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());

  const loadFilteredData = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterParams = {
        limit: 1000,
        // URL path parameters
        process_type: processType,
        product_type: productType,
        spc_monitor_name: spcMonitorName,
        // Query string parameters
        ...(filters.entity && { entity: filters.entity }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      console.log('📊 Fetching CD data with params:', filterParams);
      const dataResponse = await fetchCDData(filterParams);
      setData(dataResponse);
      setError(null);
      console.log(`✅ Fetched ${dataResponse.length} CD data records`);
    } catch (err) {
      const errorMessage = err instanceof Error && err.message.includes('JSON')
        ? 'Connection issue detected. Please refresh the page to try again.'
        : 'Failed to load filtered data. Please try again.';
      setError(errorMessage);
      console.error('Error loading filtered data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spcMonitorName, processType, productType, filters]);

  // Initialize filters from URL query params on mount
  useEffect(() => {
    const urlFilters: FilterState = {
      entity: searchParams.get('entity') || 'FAKE_TOOL1',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || ''
    };

    // Check if we have any non-entity filters from URL
    const hasUrlFilters = urlFilters.startDate !== '' || urlFilters.endDate !== '';

    if (hasUrlFilters) {
      setFilters(urlFilters);
    } else {
      setFilters(getDefaultFilters());
    }

    setIsInitialized(true);
  }, [searchParams]);

  // Load data when initialized or when URL path parameters change
  useEffect(() => {
    if (isInitialized && spcMonitorName && processType && productType) {
      loadFilteredData();
    }
  }, [isInitialized, spcMonitorName, processType, productType, loadFilteredData]);

  // Update URL query string when filters change
  useEffect(() => {
    if (isInitialized) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      const newUrl = `/spc-dashboard/${encodeURIComponent(spcMonitorName)}/${encodeURIComponent(processProduct)}${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl);
    }
  }, [filters, isInitialized, spcMonitorName, processProduct, router]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      entity: '',
      startDate: '',
      endDate: ''
    });
  }, []);

  const value: CDDataContextValue = useMemo(() => ({
    data,
    isLoading,
    error,
    filters,
    isInitialized,
    handleFiltersChange,
    clearFilters,
    refetch: loadFilteredData
  }), [data, isLoading, error, filters, isInitialized, handleFiltersChange, clearFilters, loadFilteredData]);

  return (
    <CDDataContext.Provider value={value}>
      {children}
    </CDDataContext.Provider>
  );
}

export function useCDData() {
  const context = useContext(CDDataContext);
  if (!context) {
    throw new Error('useCDData must be used within CDDataProvider');
  }
  return context;
}