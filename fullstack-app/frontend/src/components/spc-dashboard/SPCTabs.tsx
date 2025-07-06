'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  fetchSPCMonitorNames as fetchCdL1SPCMonitorNames, 
  fetchProcessProductCombinations as fetchCdL1ProcessProductCombinations, 
  ProcessProductCombination 
} from '@/services/spcCdL1Service';
import { 
  fetchSPCMonitorNames as fetchRegL1SPCMonitorNames, 
  fetchProcessProductCombinations as fetchRegL1ProcessProductCombinations
} from '@/services/spcRegL1Service';

interface SPCTabsProps {
  spcMonitor: string;
  processProduct: string;
  basePath?: string; // Optional base path for navigation
}

export default function SPCTabs({ spcMonitor, processProduct, basePath = '/spc-dashboard' }: SPCTabsProps) {
  const router = useRouter();
  const [spcMonitors, setSpcMonitors] = useState<string[]>([]);
  const [processProductCombinations, setProcessProductCombinations] = useState<ProcessProductCombination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTabOptions();
  }, []);

  const loadTabOptions = async () => {
    try {
      setLoading(true);
      // Fetch data from both CD L1 and REG L1 services
      const [
        cdL1SpcMonitors, 
        cdL1ProcessProducts,
        regL1SpcMonitors,
        regL1ProcessProducts
      ] = await Promise.all([
        fetchCdL1SPCMonitorNames(),
        fetchCdL1ProcessProductCombinations(),
        fetchRegL1SPCMonitorNames(),
        fetchRegL1ProcessProductCombinations()
      ]);
      
      // Combine SPC monitor names from both services
      const allSpcMonitors = [...new Set([...cdL1SpcMonitors, ...regL1SpcMonitors])];
      
      // Combine process-product combinations from both services
      const allProcessProducts = [...new Set([
        ...cdL1ProcessProducts.map(p => `${p.process_type}-${p.product_type}`),
        ...regL1ProcessProducts.map(p => `${p.process_type}-${p.product_type}`)
      ])].map(combo => {
        const [process_type, product_type] = combo.split('-');
        return { process_type, product_type };
      });
      
      setSpcMonitors(allSpcMonitors);
      setProcessProductCombinations(allProcessProducts);
    } catch (error) {
      console.error('Error loading tab options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSPCMonitorChange = (newSpcMonitor: string) => {
    // Keep the same process-product combination if possible, otherwise use first available
    const availableCombos = processProductCombinations;
    const currentCombo = processProduct ? processProduct.split('-') : ['1000', 'BNT44'];
    const currentProcessType = currentCombo[0];
    const currentProductType = currentCombo[1];
    
    // Check if current combination still exists
    const existingCombo = availableCombos.find(
      combo => combo.process_type === currentProcessType && combo.product_type === currentProductType
    );
    
    const targetCombo = existingCombo || availableCombos[0];
    const newProcessProduct = `${targetCombo.process_type}-${targetCombo.product_type}`;
    
    router.push(`${basePath}/${newSpcMonitor}/${newProcessProduct}`);
  };

  const handleProcessProductChange = (newProcessProduct: string) => {
    router.push(`${basePath}/${spcMonitor}/${newProcessProduct}`);
  };

  if (loading) {
    return (
      <div className="bg-white border-b">
        <div className="animate-pulse">
          <div className="border-b border-gray-200">
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 bg-gray-100 rounded mt-1"></div>
        </div>
      </div>
    );
  }

  // Get available process-product combinations for current SPC monitor
  const currentProcessProduct = processProduct ? processProduct.split('-') : ['1000', 'BNT44'];
  const currentProcessType = currentProcessProduct[0];
  const currentProductType = currentProcessProduct[1];

  return (
    <div className="bg-white border-b">
      {/* SPC Monitor Tabs (Primary) */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="SPC Monitor">
          {spcMonitors.map((monitor) => (
            <button
              key={monitor}
              onClick={() => handleSPCMonitorChange(monitor)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${monitor === spcMonitor
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={monitor === spcMonitor ? 'page' : undefined}
            >
              {monitor}
            </button>
          ))}
        </nav>
      </div>

      {/* Process-Product Combination Tabs (Secondary) */}
      <div className="bg-gray-50">
        <nav className="flex flex-wrap gap-1 p-2" aria-label="Process-Product Combinations">
          {processProductCombinations.map((combo) => {
            const comboKey = `${combo.process_type}-${combo.product_type}`;
            const isActive = combo.process_type === currentProcessType && combo.product_type === currentProductType;
            
            return (
              <button
                key={comboKey}
                onClick={() => handleProcessProductChange(comboKey)}
                className={`
                  px-3 py-1 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-800'
                  }
                `}
              >
                {combo.process_type} {combo.product_type}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}