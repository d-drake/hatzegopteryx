"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SPCLimitsProvider } from "@/contexts/SPCLimitsContext";
import { SPCDataServiceFactory } from "@/services/spc/SPCDataServiceFactory";
import { getSPCDataSourceConfig } from "@/lib/spc-dashboard/spcDataSourceRegistry";
import GenericSPCDashboard from "@/components/spc-dashboard/GenericSPCDashboard";

function SPCDashboardContent() {
  const params = useParams();

  // Extract URL parameters
  const spcMonitor = decodeURIComponent(params.spcMonitor as string);
  const processProduct = decodeURIComponent(params.processProduct as string);
  const [processType, productType] = processProduct.split("-");

  // Get the appropriate provider and service based on the monitor
  const config = getSPCDataSourceConfig(spcMonitor);
  const service = SPCDataServiceFactory.create(spcMonitor);

  // Use the generic dashboard with the appropriate provider
  const DashboardWithProvider = () => {
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
          <GenericSPCDashboard
            spcMonitor={spcMonitor}
            processProduct={processProduct}
          />
        </SPCLimitsProvider>
      </Provider>
    );
  };

  return <DashboardWithProvider />;
}

export default function SPCDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SPCDashboardContent />
    </Suspense>
  );
}