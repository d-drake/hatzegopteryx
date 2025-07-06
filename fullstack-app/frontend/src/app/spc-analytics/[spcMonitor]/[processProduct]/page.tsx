"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SPCLimitsProvider } from "@/contexts/SPCLimitsContext";
import { SPCDataServiceFactory } from "@/services/spc/SPCDataServiceFactory";
import { getSPCDataSourceConfig } from "@/lib/spc-dashboard/spcDataSourceRegistry";
import GenericSPCAnalytics from "@/components/spc-analytics/GenericSPCAnalytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function SPCAnalyticsContent() {
  const params = useParams();

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split("-");

  // Get the appropriate provider and service based on the monitor
  const config = getSPCDataSourceConfig(spcMonitor);
  const service = SPCDataServiceFactory.create(spcMonitor);

  // Use the generic analytics with the appropriate provider
  const AnalyticsWithProvider = () => {
    const Provider = config.Provider;
    
    return (
      <Provider
        processType={processType}
        productType={productType}
        spcMonitorName={spcMonitor}
        processProduct={processProduct}
      >
        <SPCLimitsProvider
          service={service}
          processType={processType}
          productType={productType}
          spcMonitor={spcMonitor}
        >
          <GenericSPCAnalytics
            spcMonitor={spcMonitor}
            processProduct={processProduct}
          />
        </SPCLimitsProvider>
      </Provider>
    );
  };

  return <AnalyticsWithProvider />;
}

export default function SPCAnalyticsPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <SPCAnalyticsContent />
      </Suspense>
    </ErrorBoundary>
  );
}