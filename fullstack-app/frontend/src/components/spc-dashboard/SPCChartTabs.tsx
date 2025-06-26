'use client';

import { ReactNode } from 'react';

interface SPCChartTabsProps {
  timelineComponent: ReactNode;
  variabilityComponent: ReactNode;
  defaultTab?: 'timeline' | 'variability';
  activeTab: string;
  onTabChange: (tab: 'timeline' | 'variability') => void;
}

export default function SPCChartTabs({
  timelineComponent,
  variabilityComponent,
  activeTab,
  onTabChange,
}: SPCChartTabsProps) {
  const tabs = [
    { id: 'timeline', label: 'Timeline Chart', component: timelineComponent },
    { id: 'variability', label: 'Variability Chart', component: variabilityComponent },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8" aria-label="Chart tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as 'timeline' | 'variability')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              role="tab"
              aria-selected={activeTab === tab.id}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              transition-opacity duration-300 ease-in-out
              ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 hidden'}
            `}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            aria-hidden={activeTab !== tab.id}
          >
            {tab.component}
          </div>
        ))}
      </div>
    </div>
  );
}