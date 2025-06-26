'use client';

import { ReactNode, useMemo } from 'react';
import { useViewportSize } from '@/hooks/useViewportSize';
import { useTabState } from '@/hooks/useTabState';
import SPCChartTabs from './SPCChartTabs';

interface SPCChartLayoutProps {
  timelineComponent: ReactNode;
  variabilityComponent: ReactNode;
  tabBreakpoint?: number; // Default 1024px
}

export default function SPCChartLayout({
  timelineComponent,
  variabilityComponent,
  tabBreakpoint = 1024,
}: SPCChartLayoutProps) {
  const { width } = useViewportSize();
  const [activeTab, changeTab] = useTabState('timeline');

  // Determine layout mode based on viewport width
  const isDesktop = useMemo(() => {
    return width >= tabBreakpoint;
  }, [width, tabBreakpoint]);

  // Desktop layout: side-by-side (60% Timeline + 40% Variability)
  if (isDesktop) {
    return (
      <div className="flex gap-4 w-full min-h-[500px]">
        {/* Timeline Chart - 60% width */}
        <div className="flex-none w-[60%]">
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
            <h4 className="text-lg font-medium mb-3 text-center text-black">
              Timeline Chart
            </h4>
            {timelineComponent}
          </div>
        </div>

        {/* Variability Chart - 40% width */}
        <div className="flex-none w-[40%]">
          <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
            <h4 className="text-lg font-medium mb-3 text-center text-black">
              Variability Analysis
            </h4>
            {variabilityComponent}
          </div>
        </div>
      </div>
    );
  }

  // Mobile/Tablet layout: tabs
  return (
    <div className="w-full">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <SPCChartTabs
          timelineComponent={timelineComponent}
          variabilityComponent={variabilityComponent}
          activeTab={activeTab}
          onTabChange={changeTab}
        />
      </div>
    </div>
  );
}