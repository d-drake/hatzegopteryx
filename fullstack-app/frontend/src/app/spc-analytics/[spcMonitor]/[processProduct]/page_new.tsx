'use client';

import { useParams } from 'next/navigation';
import Header from '@/components/auth/Header';
import AppTabs from '@/components/AppTabs';
import SPCTabs from '@/components/spc-dashboard/SPCTabs';
import { SPCLimitsProvider } from '@/contexts/SPCLimitsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SPCProviderSelector from '@/components/spc-analytics/SPCProviderSelector';
import SPCAnalyticsContent from '@/components/spc-analytics/SPCAnalyticsContent';

export default function SPCAnalyticsPage() {
  const params = useParams();
  const spcMonitor = params.spcMonitor as string;
  const processProduct = params.processProduct as string;

  // Parse process and product from the combined parameter
  const [processType, productType] = processProduct ? processProduct.split('-') : ['', ''];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AppTabs activeTab="spc" />
        
        <div className="mt-6">
          <SPCTabs
            processProduct={processProduct}
            spcMonitor={spcMonitor}
            basePath="/spc-analytics"
          />
        </div>

        <ErrorBoundary>
          <SPCProviderSelector
            spcMonitor={spcMonitor}
            processType={processType}
            productType={productType}
            processProduct={processProduct}
          >
            <SPCLimitsProvider
              processType={processType}
              productType={productType}
              spcMonitor={spcMonitor}
            >
              <div className="mt-6">
                <SPCAnalyticsContent
                  spcMonitor={spcMonitor}
                  processType={processType}
                  productType={productType}
                />
              </div>
            </SPCLimitsProvider>
          </SPCProviderSelector>
        </ErrorBoundary>
      </div>
    </div>
  );
}