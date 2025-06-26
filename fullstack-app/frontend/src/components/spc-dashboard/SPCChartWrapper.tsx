'use client';

import { useState } from 'react';

interface TabConfig {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface SPCChartWrapperProps {
  title: string;
  tabs?: TabConfig[];
  defaultTab?: string;
  children?: React.ReactNode;
}

export default function SPCChartWrapper({
  title,
  tabs,
  defaultTab = 'timeline',
  children
}: SPCChartWrapperProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // If no tabs provided, just render children with improved layout
  if (!tabs) {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Title Section - separate from chart area */}
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-lg font-medium text-center text-black">{title}</h4>
        </div>
        
        {/* Chart Content Area */}
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    );
  }

  // Render with tabs
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Title Section - above everything */}
      <div className="px-4 pt-4 pb-2">
        <h4 className="text-lg font-medium text-center text-black">{title}</h4>
      </div>
      
      {/* Tabs Section */}
      <div className="px-4 pb-2">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content Area - contains the chart which has zoom controls */}
      <div className="p-4">
        {tabs.find(tab => tab.id === activeTab)?.content || children}
      </div>
    </div>
  );
}