'use client';

import React from 'react';
import { SPCCdL1Provider } from '@/contexts/SPCCdL1Context';
import { SPCRegL1Provider } from '@/contexts/SPCRegL1Context';

interface SPCProviderSelectorProps {
  spcMonitor: string;
  processType: string;
  productType: string;
  processProduct: string;
  children: React.ReactNode;
}

export default function SPCProviderSelector({
  spcMonitor,
  processType,
  productType,
  processProduct,
  children
}: SPCProviderSelectorProps) {
  // Determine which provider to use based on spcMonitor
  const dataType = spcMonitor.includes('_CD_') ? 'CD' : 
                   spcMonitor.includes('_REG_') ? 'REG' : 
                   'UNKNOWN';

  switch (dataType) {
    case 'CD':
      return (
        <SPCCdL1Provider
          processType={processType}
          productType={productType}
          spcMonitorName={spcMonitor}
          processProduct={processProduct}
        >
          {children}
        </SPCCdL1Provider>
      );
    
    case 'REG':
      return (
        <SPCRegL1Provider
          processType={processType}
          productType={productType}
          spcMonitorName={spcMonitor}
          processProduct={processProduct}
        >
          {children}
        </SPCRegL1Provider>
      );
    
    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Error: Unknown SPC monitor type &quot;{spcMonitor}&quot;. 
            Supported types are: SPC_CD_L1, SPC_CD_L2, SPC_CD_L3, SPC_REG_L1, SPC_REG_L2, SPC_REG_L3
          </p>
        </div>
      );
  }
}