"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { SPCDataItem, FilterParams, DataResponse } from "@/types";
import { ISPCDataService } from "@/services/spc/ISPCDataService";
import { SPCDataServiceFactory } from "@/services/spc/SPCDataServiceFactory";

export interface FilterState {
  entity: string;
  startDate: string;
  endDate: string;
}

interface SPCDataContextValue<T extends SPCDataItem> {
  data: T[];
  allEntityData: T[]; // Data without entity filter
  isLoading: boolean;
  error: string | null;
  filters: FilterState;
  isInitialized: boolean;
  handleFiltersChange: (newFilters: FilterState) => void;
  clearFilters: () => void;
  refetch: () => Promise<void>;
  service: ISPCDataService<T>;
}

// Create a generic context factory
export function createSPCDataContext<T extends SPCDataItem>() {
  return createContext<SPCDataContextValue<T> | null>(null);
}

interface SPCDataProviderProps<T extends SPCDataItem> {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
  processProduct: string;
  context: React.Context<SPCDataContextValue<T> | null>;
}

// Cache for storing data by key
const dataCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function SPCDataProvider<T extends SPCDataItem>({
  children,
  processType,
  productType,
  spcMonitorName,
  processProduct,
  context,
}: SPCDataProviderProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<T[]>([]);
  const [allEntityData, setAllEntityData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get the appropriate service based on spcMonitorName
  const service = useMemo(() => {
    return SPCDataServiceFactory.create(spcMonitorName) as ISPCDataService<T>;
  }, [spcMonitorName]);

  // Create default filters
  const getDefaultFilters = (): FilterState => {
    const today = new Date();

    // Set start date to 30 days ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);

    // Set end date to tomorrow (today + 1 day)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const filters = {
      entity: "FAKE_TOOL1",
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };

    return filters;
  };

  const [filters, setFilters] = useState<FilterState>(getDefaultFilters());
  const loadingRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadFilteredData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      console.log("📊 Request already in progress, skipping...");
      return;
    }

    // Generate unique request ID
    const requestId = ++loadRequestIdRef.current;

    // Base params without entity filter
    const baseFilterParams: FilterParams = {
      pageSize: 1000,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    };

    // Create cache key
    const cacheKey = JSON.stringify({
      spcMonitor: spcMonitorName,
      processType,
      productType,
      ...baseFilterParams,
    });

    try {
      loadingRef.current = true;
      setIsLoading(true);

      // Check cache first
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log("📊 Using cached data");
        setAllEntityData(cached.data);

        // Apply entity filter for dashboard
        if (
          filters.entity &&
          !window.location.pathname.includes("/spc-analytics")
        ) {
          const filtered = cached.data.filter(
            (d) => d.entity === filters.entity,
          );
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
      console.log("📊 Fetching all entity data with params:", baseFilterParams);
      const response = await service.fetchData({
        spcMonitor: spcMonitorName,
        processType,
        productType,
        filterParams: baseFilterParams,
      });

      const allDataResponse = response.data;

      // Cache the response
      dataCache.set(cacheKey, { data: allDataResponse, timestamp: Date.now() });

      setAllEntityData(allDataResponse);

      // For dashboard, apply entity filter client-side
      if (
        filters.entity &&
        !window.location.pathname.includes("/spc-analytics")
      ) {
        const filtered = allDataResponse.filter(
          (d) => d.entity === filters.entity,
        );
        setData(filtered);
      } else {
        // For analytics or when no entity filter, use all data
        setData(allDataResponse);
      }

      setError(null);
      console.log(`✅ Fetched ${allDataResponse.length} total records`);
    } catch (err) {
      // Check if this request is still current
      if (requestId !== loadRequestIdRef.current) {
        console.log("📊 Request superseded, ignoring error");
        return;
      }

      console.error("Error loading SPC data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      Sentry.captureException(err, {
        tags: {
          component: "SPCDataContext",
          spcMonitor: spcMonitorName,
          processType,
          productType,
        },
      });
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, [filters, processType, productType, spcMonitorName, service]);

  // Initialize filters from URL on mount
  useEffect(() => {
    const selectedEntities = searchParams.get("selectedEntities");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let newFilters = getDefaultFilters();

    if (selectedEntities) {
      // For now, just use the first entity if multiple are selected
      const entities = selectedEntities.split(",");
      if (entities.length > 0) {
        newFilters.entity = entities[0];
      }
    }

    if (startDate) {
      newFilters.startDate = startDate;
    }

    if (endDate) {
      newFilters.endDate = endDate;
    }

    setFilters(newFilters);
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - searchParams is intentionally omitted to prevent re-initialization on URL changes

  // Load data when filters change (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      loadFilteredData();
    }, 500); // 500ms debounce

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, loadFilteredData, isInitialized]);

  const handleFiltersChange = useCallback(
    (newFilters: FilterState) => {
      console.log("📊 Filters changed:", newFilters);
      setFilters(newFilters);

      // Update URL
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.entity) {
        params.set("selectedEntities", newFilters.entity);
      } else {
        params.delete("selectedEntities");
      }

      if (newFilters.startDate) {
        params.set("startDate", newFilters.startDate);
      } else {
        params.delete("startDate");
      }

      if (newFilters.endDate) {
        params.set("endDate", newFilters.endDate);
      } else {
        params.delete("endDate");
      }

      // Use router.push to update URL
      const newUrl = params.toString()
        ? `?${params}`
        : window.location.pathname;
      router.push(newUrl);
    },
    [searchParams, router],
  );

  const clearFilters = useCallback(() => {
    const defaultFilters = getDefaultFilters();
    handleFiltersChange(defaultFilters);
  }, [handleFiltersChange]);

  const refetch = useCallback(async () => {
    await loadFilteredData();
  }, [loadFilteredData]);

  const value = useMemo(
    () => ({
      data,
      allEntityData,
      isLoading,
      error,
      filters,
      isInitialized,
      handleFiltersChange,
      clearFilters,
      refetch,
      service,
    }),
    [
      data,
      allEntityData,
      isLoading,
      error,
      filters,
      isInitialized,
      handleFiltersChange,
      clearFilters,
      refetch,
      service,
    ],
  );

  return React.createElement(context.Provider, { value }, children);
}

// Hook factory for using the context
export function createUseSPCData<T extends SPCDataItem>(
  context: React.Context<SPCDataContextValue<T> | null>,
) {
  return function useSPCData() {
    const contextValue = useContext(context);

    if (!contextValue) {
      throw new Error("useSPCData must be used within SPCDataProvider");
    }

    return contextValue;
  };
}

