'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { fetchSPCLimits, SPCLimit } from '@/services/cdDataService';

interface SPCLimitsContextValue {
  limits: SPCLimit[];
  isLoading: boolean;
  error: string | null;
  getLimitsForChart: (chartName: string) => SPCLimit[];
  refetch: () => Promise<void>;
}

const SPCLimitsContext = createContext<SPCLimitsContextValue | null>(null);

interface SPCLimitsProviderProps {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitorName: string;
}

export function SPCLimitsProvider({ 
  children, 
  processType, 
  productType, 
  spcMonitorName 
}: SPCLimitsProviderProps) {
  const [limits, setLimits] = useState<SPCLimit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllLimits = useCallback(async () => {
    if (!processType || !productType || !spcMonitorName) {
      setLimits([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all SPC limits for this combination at once
      const allLimits = await fetchSPCLimits({
        process_type: processType,
        product_type: productType,
        spc_monitor_name: spcMonitorName
        // Note: NOT specifying spc_chart_name to get all charts
      });
      
      setLimits(allLimits);
      console.log(`Fetched ${allLimits.length} SPC limits for all charts`);
    } catch (err) {
      console.error('Error fetching SPC limits:', err);
      setError('Failed to fetch SPC limits');
      setLimits([]);
    } finally {
      setIsLoading(false);
    }
  }, [processType, productType, spcMonitorName]);

  useEffect(() => {
    fetchAllLimits();
  }, [fetchAllLimits]);

  const getLimitsForChart = useCallback((chartName: string): SPCLimit[] => {
    return limits.filter(limit => limit.spc_chart_name === chartName);
  }, [limits]);

  const value: SPCLimitsContextValue = useMemo(() => ({
    limits,
    isLoading,
    error,
    getLimitsForChart,
    refetch: fetchAllLimits
  }), [limits, isLoading, error, getLimitsForChart, fetchAllLimits]);

  return (
    <SPCLimitsContext.Provider value={value}>
      {children}
    </SPCLimitsContext.Provider>
  );
}

export function useSPCLimits() {
  const context = useContext(SPCLimitsContext);
  if (!context) {
    throw new Error('useSPCLimits must be used within SPCLimitsProvider');
  }
  return context;
}