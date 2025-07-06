'use client';

import { useSPCCdL1 } from '@/contexts/SPCCdL1Context';
import { useSPCRegL1 } from '@/contexts/SPCRegL1Context';
import GenericSPCAnalyticsPage from './GenericSPCAnalyticsPage';

interface SPCAnalyticsContentProps {
  spcMonitor: string;
  processType: string;
  productType: string;
}

// Content component for CD data
export function SPCCdL1AnalyticsContent({
  spcMonitor,
  processType,
  productType
}: SPCAnalyticsContentProps) {
  const { 
    data, 
    isLoading, 
    error, 
    filters,
    handleFiltersChange 
  } = useSPCCdL1();

  return (
    <GenericSPCAnalyticsPage
      spcMonitor={spcMonitor}
      processType={processType}
      productType={productType}
      data={data}
      loading={isLoading}
      error={error}
      onFiltersChange={handleFiltersChange}
      selectedEntity={filters.entity}
    />
  );
}

// Content component for REG data
export function SPCRegL1AnalyticsContent({
  spcMonitor,
  processType,
  productType
}: SPCAnalyticsContentProps) {
  const { 
    data, 
    isLoading, 
    error, 
    filters,
    handleFiltersChange 
  } = useSPCRegL1();

  return (
    <GenericSPCAnalyticsPage
      spcMonitor={spcMonitor}
      processType={processType}
      productType={productType}
      data={data}
      loading={isLoading}
      error={error}
      onFiltersChange={handleFiltersChange}
      selectedEntity={filters.entity}
    />
  );
}

// Selector component
export default function SPCAnalyticsContent({
  spcMonitor,
  processType,
  productType
}: SPCAnalyticsContentProps) {
  const dataType = spcMonitor.includes('_CD_') ? 'CD' : 
                   spcMonitor.includes('_REG_') ? 'REG' : 
                   'UNKNOWN';

  switch (dataType) {
    case 'CD':
      return (
        <SPCCdL1AnalyticsContent
          spcMonitor={spcMonitor}
          processType={processType}
          productType={productType}
        />
      );
    
    case 'REG':
      return (
        <SPCRegL1AnalyticsContent
          spcMonitor={spcMonitor}
          processType={processType}
          productType={productType}
        />
      );
    
    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Error: Unknown SPC monitor type &quot;{spcMonitor}&quot;
          </p>
        </div>
      );
  }
}