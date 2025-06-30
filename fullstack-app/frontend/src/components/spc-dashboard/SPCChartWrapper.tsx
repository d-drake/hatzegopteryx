'use client';

import { useState, useCallback, cloneElement, ReactElement, isValidElement } from 'react';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import ResponsiveChartWrapper from '@/components/charts/ResponsiveChartWrapper';

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
  syncViews?: boolean;
  activeView?: 'timeline' | 'variability';
  onViewChange?: (view: 'timeline' | 'variability') => void;
}

// Constants for side-by-side layout
const SIDE_BY_SIDE_BREAKPOINT = 1500;
const CHART_GAP = 5;
const TIMELINE_WIDTH_RATIO = 0.55;
const VARIABILITY_WIDTH_RATIO = 0.45;

// Chart margins - consistent for both charts
const CHART_MARGIN = { top: 30, right: 240, bottom: 60, left: 70 };

export default function SPCChartWrapper({
  title,
  tabs,
  defaultTab = 'timeline',
  children,
  syncViews = false,
  activeView,
  onViewChange
}: SPCChartWrapperProps) {
  const [localActiveTab, setLocalActiveTab] = useState(defaultTab);
  const [xZoomDomain, setXZoomDomain] = useState<[number, number] | [Date, Date] | null>(null);
  const [yZoomDomain, setYZoomDomain] = useState<[number, number] | null>(null);
  const [y2ZoomDomain, setY2ZoomDomain] = useState<[number, number] | null>(null);
  const viewportWidth = useViewportWidth();
  
  // Use synced view if enabled, otherwise use local tab state
  const activeTab = syncViews && activeView ? activeView : localActiveTab;
  
  const handleXZoomChange = useCallback((domain: [number, number] | [Date, Date] | null) => {
    setXZoomDomain(domain);
  }, []);
  
  const handleYZoomChange = useCallback((domain: [number, number] | null) => {
    setYZoomDomain(domain);
  }, []);
  
  const handleY2ZoomChange = useCallback((domain: [number, number] | null) => {
    setY2ZoomDomain(domain);
  }, []);
  
  const handleResetZoom = useCallback(() => {
    setXZoomDomain(null);
    setYZoomDomain(null);
    setY2ZoomDomain(null);
  }, []);
  
  const handleTabClick = useCallback((tabId: string) => {
    setLocalActiveTab(tabId);
    if (syncViews && onViewChange && (tabId === 'timeline' || tabId === 'variability')) {
      onViewChange(tabId);
    }
  }, [syncViews, onViewChange]);

  // Helper function to inject zoom props into chart components
  const injectZoomProps = (content: React.ReactNode, width?: number, isSideBySide: boolean = false): React.ReactNode => {
    if (isValidElement(content)) {
      const contentProps = content.props as any;
      
      // Handle ResponsiveChartWrapper
      if (contentProps.children && typeof contentProps.children === 'function') {
        if (width) {
          // In side-by-side mode, pass the calculated width to ResponsiveChartWrapper
          // by setting maxWidth to prevent it from using its default 800px
          return cloneElement(content, {
            maxWidth: width,
            children: (resWidth: number) => {
              const child = contentProps.children(resWidth);
              if (isValidElement(child)) {
                return cloneElement(child, {
                  width: Math.min(resWidth, width), // Ensure we don't exceed calculated width
                  xZoomDomain: xZoomDomain,
                  yZoomDomain: yZoomDomain,
                  y2ZoomDomain: y2ZoomDomain,
                  onXZoomChange: handleXZoomChange,
                  onYZoomChange: handleYZoomChange,
                  onY2ZoomChange: handleY2ZoomChange,
                  onResetZoom: handleResetZoom,
                  isSideBySide: isSideBySide,
                } as any);
              }
              return child;
            }
          } as any);
        } else {
          // In tabbed mode, let ResponsiveChartWrapper work normally
          return cloneElement(content, {
            children: (resWidth: number) => {
              const child = contentProps.children(resWidth);
              if (isValidElement(child)) {
                return cloneElement(child, {
                  width: resWidth,
                  xZoomDomain: xZoomDomain,
                  yZoomDomain: yZoomDomain,
                  y2ZoomDomain: y2ZoomDomain,
                  onXZoomChange: handleXZoomChange,
                  onYZoomChange: handleYZoomChange,
                  onY2ZoomChange: handleY2ZoomChange,
                  onResetZoom: handleResetZoom,
                } as any);
              }
              return child;
            }
          } as any);
        }
      }
      
      // Handle direct chart components
      return cloneElement(content, {
        xZoomDomain: xZoomDomain,
        yZoomDomain: yZoomDomain,
        y2ZoomDomain: y2ZoomDomain,
        onXZoomChange: handleXZoomChange,
        onYZoomChange: handleYZoomChange,
        onY2ZoomChange: handleY2ZoomChange,
        onResetZoom: handleResetZoom,
        isSideBySide: isSideBySide,
      } as any);
    }
    return content;
  };

  // If no tabs provided, just render children with improved layout
  if (!tabs) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-lg font-medium text-center text-black">{title}</h4>
        </div>
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    );
  }

  // Check if we should use side-by-side layout
  const isSideBySide = viewportWidth >= SIDE_BY_SIDE_BREAKPOINT && tabs.length === 2;

  // Calculate widths for side-by-side mode
  if (isSideBySide) {
    // The actual container has padding: p-4 (16px) on each side
    // Plus the container itself has margins/padding from its parent
    // Let's be more conservative with the calculation
    const containerPadding = 32; // 16px * 2 for p-4
    const containerMargin = 32; // Additional margin for the container itself
    const totalPadding = containerPadding + containerMargin;
    
    // Calculate the actual available width inside the bg-white container
    const containerWidth = Math.min(viewportWidth - totalPadding, 1504); // Cap at observed max
    
    // Account for the gap between charts and the internal padding
    const chartAreaPadding = 32; // p-4 inside the container
    const availableWidth = containerWidth - CHART_GAP - chartAreaPadding;
    
    const timelineWidth = Math.floor(availableWidth * TIMELINE_WIDTH_RATIO);
    const variabilityWidth = Math.floor(availableWidth * VARIABILITY_WIDTH_RATIO);
    
    // Find the Timeline and Variability tabs
    const timelineTab = tabs.find(tab => tab.id === 'timeline');
    const variabilityTab = tabs.find(tab => tab.id === 'variability');

    if (timelineTab && variabilityTab) {
      return (
        <div className="bg-white rounded-lg shadow">
          {/* Shared title */}
          <div className="px-4 pt-4 pb-2">
            <h4 className="text-lg font-medium text-center text-black">{title}</h4>
          </div>
          
          {/* Side-by-side charts */}
          <div className="flex gap-[5px] p-4 pt-16">
            {/* Timeline Chart */}
            <div className="flex-none" style={{ width: `${timelineWidth}px` }}>
              {injectZoomProps(timelineTab.content, timelineWidth, true)}
            </div>
            
            {/* Variability Chart */}
            <div className="flex-none" style={{ width: `${variabilityWidth}px` }}>
              {injectZoomProps(variabilityTab.content, variabilityWidth, true)}
            </div>
          </div>
        </div>
      );
    }
  }

  // Render with tabs (narrow viewport)
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Title Section - above everything */}
      <div className="px-4 pt-4 pb-1">
        <h4 className="text-lg font-medium text-center text-black">{title}</h4>
      </div>
      
      {/* Tabs Section */}
      <div className="px-4 pb-0">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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
      <div className="p-4 pt-16">
        {tabs.map((tab) => {
          if (tab.id !== activeTab) return null;
          return <div key={tab.id}>{injectZoomProps(tab.content)}</div>;
        })}
      </div>
    </div>
  );
}