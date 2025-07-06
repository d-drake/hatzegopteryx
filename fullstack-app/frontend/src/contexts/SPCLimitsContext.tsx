"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { SPCLimits, SPCDataItem } from "@/types";
import { ISPCDataService } from "@/services/spc/ISPCDataService";

interface SPCLimitsContextValue {
  limits: SPCLimits[];
  isLoading: boolean;
  error: string | null;
  getLimitsForChart: (chartName: string) => SPCLimits[];
  refetch: () => Promise<void>;
}

const SPCLimitsContext = createContext<SPCLimitsContextValue | null>(null);

interface SPCLimitsProviderProps<T extends SPCDataItem> {
  children: React.ReactNode;
  processType: string;
  productType: string;
  spcMonitor: string;
  service?: ISPCDataService<T>;
}

export function SPCLimitsProvider<T extends SPCDataItem>({
  children,
  processType,
  productType,
  spcMonitor,
  service,
}: SPCLimitsProviderProps<T>) {
  const [limits, setLimits] = useState<SPCLimits[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllLimits = useCallback(async () => {
    if (!processType || !productType || !spcMonitor || !service) {
      setLimits([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all SPC limits for this combination using the service
      const allLimits = await service.getSPCLimits({
        spcMonitor,
        processType,
        productType,
      });

      setLimits(allLimits);
      console.log(`Fetched ${allLimits.length} SPC limits for all charts`);
    } catch (err) {
      console.error("Error fetching SPC limits:", err);
      setError("Failed to fetch SPC limits");
      setLimits([]);
    } finally {
      setIsLoading(false);
    }
  }, [processType, productType, spcMonitor, service]);

  useEffect(() => {
    fetchAllLimits();
  }, [fetchAllLimits]);

  const getLimitsForChart = useCallback(
    (chartName: string): SPCLimits[] => {
      return limits.filter((limit) => limit.spc_chart_name === chartName);
    },
    [limits],
  );

  const value: SPCLimitsContextValue = useMemo(
    () => ({
      limits,
      isLoading,
      error,
      getLimitsForChart,
      refetch: fetchAllLimits,
    }),
    [limits, isLoading, error, getLimitsForChart, fetchAllLimits],
  );

  return (
    <SPCLimitsContext.Provider value={value}>
      {children}
    </SPCLimitsContext.Provider>
  );
}

export function useSPCLimits() {
  const context = useContext(SPCLimitsContext);
  if (!context) {
    throw new Error("useSPCLimits must be used within SPCLimitsProvider");
  }
  return context;
}

