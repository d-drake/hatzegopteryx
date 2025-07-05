'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { fetchSPCCdL1Data, SPCCdL1Item } from '@/services/spcCdL1Service';
import { FilterState } from '@/components/spc-dashboard/FilterControls';

interface SPCCdL1ContextValue {
  data: SPCCdL1Item[];
  allEntityData: SPCCdL1Item[]; // Data without entity filter
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  isInitialized: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
}

const SPCCdL1Context = createContext<SPCCdL1ContextValue | null>(null);

interface SPCCdL1ProviderProps {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
  processProduct: string;
}

// Cache for storing data by key
const dataCache = new Map<string, { data: SPCCdL1Item[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function SPCCdL1Provider({ 
  children, 
  processType, 
  productType, 
  spcMonitorName,
  processProduct
}: SPCCdL1ProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<SPCCdL1Item[]>([]);
  const [allEntityData, setAllEntityData] = useState<SPCCdL1Item[]>([]);
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
  const loadingRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadFilteredData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log('📊 Request already in progress, skipping...');
      return;
    }

    // Generate unique request ID
    const requestId = ++loadRequestIdRef.current;
    // Base params without entity filter
    const baseParams = {
      limit: 1000,
      process_type: processType,
      product_type: productType,
      spc_monitor_name: spcMonitorName,
      ...(filters.startDate && { startDate: filters.startDate }),
      ...(filters.endDate && { endDate: filters.endDate })
    };

    // Create cache key
    const cacheKey = JSON.stringify(baseParams);
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      
      // Check cache first
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📊 Using cached data');
        setAllEntityData(cached.data);
        
        // Apply entity filter for dashboard
        if (filters.entity && !window.location.pathname.includes('/spc-analytics')) {
          const filtered = cached.data.filter(d => d.entity === filters.entity);
          setData(filtered);
        } else {
          setData(cached.data);
        }
        
        setError(null);
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      // Fetch data without entity filter (for variability charts and analytics)
      console.log('📊 Fetching all entity data with params:', baseParams);
      const allDataResponse = await fetchSPCCdL1Data(baseParams);
      
      // Cache the response
      dataCache.set(cacheKey, { data: allDataResponse, timestamp: Date.now() });
      
      setAllEntityData(allDataResponse);
      
      // For dashboard, apply entity filter client-side
      if (filters.entity && !window.location.pathname.includes('/spc-analytics')) {
        const filtered = allDataResponse.filter(d => d.entity === filters.entity);
        setData(filtered);
      } else {
        // For analytics or when no entity filter, use all data
        setData(allDataResponse);
      }
      
      setError(null);
      console.log(`✅ Fetched ${allDataResponse.length} total records`);
    } catch (err) {
      const errorMessage = err instanceof Error && err.message.includes('JSON')
        ? 'Connection issue detected. Please refresh the page to try again.'
        : 'Failed to load filtered data. Please try again.';
      setError(errorMessage);
      console.error('Error loading filtered data:', err);
      
      // Track error in Sentry with context
      Sentry.captureException(err, {
        tags: {
          component: 'SPCCdL1Context',
          action: 'loadFilteredData'
        },
        extra: {
          spcMonitorName,
          processType,
          productType,
          filters,
          cacheKey
        }
      });
    } finally {
      // Only clear loading if this is still the current request
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [spcMonitorName, processType, productType, filters]);

  // Initialize filters from URL query params on mount
  useEffect(() => {
    const isAnalyticsPage = window.location.pathname.includes('/spc-analytics');
    
    const urlFilters: FilterState = {
      // Don't use entity from URL for analytics page
      entity: isAnalyticsPage ? 'FAKE_TOOL1' : (searchParams.get('entity') || 'FAKE_TOOL1'),
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
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the load to prevent rapid successive calls
      debounceTimerRef.current = setTimeout(() => {
        loadFilteredData();
      }, 100); // Small delay to batch rapid changes

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [isInitialized, spcMonitorName, processType, productType, loadFilteredData]);

  // Update URL query string when filters change
  useEffect(() => {
    if (isInitialized) {
      const currentPath = window.location.pathname;
      const isAnalyticsPage = currentPath.includes('/spc-analytics');
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        // Don't include entity in URL for analytics page
        if (value && !(isAnalyticsPage && key === 'entity')) {
          params.set(key, value);
        }
      });
      
      // Preserve analyticsEntity parameter if on analytics page
      if (isAnalyticsPage) {
        const analyticsEntity = searchParams.get('analyticsEntity');
        if (analyticsEntity) {
          params.set('analyticsEntity', analyticsEntity);
        }
      }

      const queryString = params.toString();
      // Get current path to maintain the correct route (dashboard or analytics)
      const basePath = isAnalyticsPage ? '/spc-analytics' : '/spc-dashboard';
      const newUrl = `${basePath}/${encodeURIComponent(spcMonitorName)}/${encodeURIComponent(processProduct)}${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [filters, isInitialized, spcMonitorName, processProduct, router, searchParams]);

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

  const value: SPCCdL1ContextValue = useMemo(() => ({
    data,
    allEntityData,
    isLoading,
    error,
    filters,
    isInitialized,
    handleFiltersChange,
    clearFilters,
    refetch: loadFilteredData
  }), [data, allEntityData, isLoading, error, filters, isInitialized, handleFiltersChange, clearFilters, loadFilteredData]);

  return (
    <SPCCdL1Context.Provider value={value}>
      {children}
    </SPCCdL1Context.Provider>
  );
}

export function useSPCCdL1() {
  const context = useContext(SPCCdL1Context);
  if (!context) {
    throw new Error('useSPCCdL1 must be used within SPCCdL1Provider');
  }
  return context;
}