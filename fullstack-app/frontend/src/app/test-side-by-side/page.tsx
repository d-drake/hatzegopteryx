'use client';

import { useState, useEffect } from 'react';
import SPCChartWithSharedData from '@/components/spc-dashboard/SPCChartWithSharedData';
import { fetchSPCCdL1Data, SPCCdL1Item } from '@/services/spcCdL1Service';

const TEST_WIDTHS = [
  { width: 500, name: 'Mobile' },
  { width: 800, name: 'Tablet' },
  { width: 1024, name: 'Small Desktop' },
  { width: 1200, name: 'Medium Desktop' },
  { width: 1499, name: 'Just Below Breakpoint' },
  { width: 1500, name: 'At Breakpoint (Side-by-Side Starts)' },
  { width: 1600, name: 'Above Breakpoint' },
  { width: 1920, name: 'Full HD' },
  { width: 2560, name: '2K' },
];

export default function TestSideBySidePage() {
  const [selectedWidth, setSelectedWidth] = useState(1920);
  const [showRuler, setShowRuler] = useState(true);
  const [data, setData] = useState<SPCCdL1Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Load sample data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchSPCCdL1Data({
          limit: 100,
          process_type: '1000',
          product_type: 'BNT44',
          spc_monitor_name: 'SPC_CD_L1'
        });
        setData(response);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Control Panel */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-semibold mb-3">Side-by-Side Layout Test Page</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Viewport Width:
              </label>
              <select
                value={selectedWidth}
                onChange={(e) => setSelectedWidth(Number(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                {TEST_WIDTHS.map(({ width, name }) => (
                  <option key={width} value={width}>
                    {width}px - {name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Current: {selectedWidth}px
              </label>
              <span className={`text-sm font-semibold ${selectedWidth >= 1500 ? 'text-green-600' : 'text-blue-600'}`}>
                ({selectedWidth >= 1500 ? 'Side-by-Side' : 'Tabbed'})
              </span>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showRuler}
                  onChange={(e) => setShowRuler(e.target.checked)}
                />
                Show Width Ruler
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Width Ruler */}
      {showRuler && (
        <div className="bg-yellow-100 border-b border-yellow-300 relative h-8">
          <div
            className="absolute left-0 top-0 h-full bg-yellow-400"
            style={{ width: `${selectedWidth}px` }}
          >
            <div className="absolute right-0 top-0 h-full w-px bg-red-600" />
            <div className="absolute right-2 top-1 text-xs font-medium">
              {selectedWidth}px
            </div>
          </div>
          <div
            className="absolute top-0 h-full w-px bg-green-600"
            style={{ left: '1500px' }}
          >
            <div className="absolute left-2 top-1 text-xs font-medium text-green-700">
              1500px (breakpoint)
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="p-4">
        <div
          className="mx-auto transition-all duration-300 bg-white rounded-lg shadow-lg"
          style={{ width: `${selectedWidth}px` }}
        >
          <div className="border-2 border-dashed border-blue-300 rounded-lg">
            {/* Render the actual SPC Dashboard */}
            <div style={{ width: '100%', overflow: 'hidden' }}>
              {loading ? (
                <div className="p-8 text-center">Loading data...</div>
              ) : data.length > 0 ? (
                <SPCChartWithSharedData
                  title="CD ATT Test"
                  data={data}
                  yField="cd_att"
                  colorField="fake_property1"
                  shapeField="fake_property2"
                  processType="1000"
                  productType="BNT44"
                  spcMonitor="SPC_CD_L1"
                />
              ) : (
                <div className="p-8 text-center">No data available</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Info Box */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Layout Behavior</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Width {'<'} 1500px:</strong> Tabbed interface with Timeline/Variability tabs</li>
              <li>• <strong>Width ≥ 1500px:</strong> Side-by-side layout with both charts visible</li>
              <li>• <strong>Chart Split:</strong> Timeline gets ~55% width, Variability gets ~45% width</li>
              <li>• <strong>X-axis alignment:</strong> Both charts maintain equal x-axis widths</li>
              <li>• <strong>Zoom sync:</strong> Zooming on one chart updates both in side-by-side mode</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}