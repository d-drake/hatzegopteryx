"use client";

import React, {
  useState,
  useCallback,
  cloneElement,
  ReactElement,
  isValidElement,
} from "react";
import { useViewportWidth } from "@/hooks/useViewportWidth";
import ResponsiveChartWrapper from "@/components/charts/ResponsiveChartWrapper";

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
  activeView?: "timeline" | "variability";
  onViewChange?: (view: "timeline" | "variability") => void;
  bottomContent?: React.ReactNode;
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
  defaultTab = "timeline",
  children,
  syncViews = false,
  activeView,
  onViewChange,
  bottomContent,
}: SPCChartWrapperProps) {
  const [localActiveTab, setLocalActiveTab] = useState(defaultTab);
  const [xZoomDomain, setXZoomDomain] = useState<
    [number, number] | [Date, Date] | null
  >(null);
  const [yZoomDomain, setYZoomDomain] = useState<[number, number] | null>(null);
  const [y2ZoomDomain, setY2ZoomDomain] = useState<[number, number] | null>(
    null,
  );

  // Legend selection state - shared across view changes
  const [selectedColorItems, setSelectedColorItems] = useState<Set<string>>(
    new Set(),
  );
  const [selectedShapeItems, setSelectedShapeItems] = useState<Set<string>>(
    new Set(),
  );

  const viewportWidth = useViewportWidth();

  // Keep localActiveTab in sync with activeView when sync is enabled
  React.useEffect(() => {
    if (syncViews && activeView) {
      setLocalActiveTab(activeView);
    }
  }, [syncViews, activeView]);

  // Use synced view if enabled, otherwise use local tab state
  const activeTab = syncViews && activeView ? activeView : localActiveTab;

  const handleXZoomChange = useCallback(
    (domain: [number, number] | [Date, Date] | null) => {
      setXZoomDomain(domain);
    },
    [],
  );

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

  // Legend selection handlers
  const handleColorLegendClick = useCallback((label: string) => {
    setSelectedColorItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }, []);

  const handleShapeLegendClick = useCallback((label: string) => {
    setSelectedShapeItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }, []);

  const handleResetLegendSelections = useCallback(() => {
    setSelectedColorItems(new Set());
    setSelectedShapeItems(new Set());
  }, []);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setLocalActiveTab(tabId);
      if (
        syncViews &&
        onViewChange &&
        (tabId === "timeline" || tabId === "variability")
      ) {
        onViewChange(tabId);
      }
    },
    [syncViews, onViewChange],
  );

  // Helper function to inject zoom props into chart components
  const injectZoomProps = (
    content: React.ReactNode,
    width?: number,
    isSideBySide: boolean = false,
  ): React.ReactNode => {
    if (isValidElement(content)) {
      const contentProps = content.props as any;

      // Handle ResponsiveChartWrapper
      if (
        contentProps.children &&
        typeof contentProps.children === "function"
      ) {
        // Let ResponsiveChartWrapper work normally in all cases
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
                isSideBySide: isSideBySide,
                // Legend props
                selectedColorItems: selectedColorItems,
                selectedShapeItems: selectedShapeItems,
                onColorLegendClick: handleColorLegendClick,
                onShapeLegendClick: handleShapeLegendClick,
                onResetLegendSelections: handleResetLegendSelections,
              } as any);
            }
            return child;
          },
        } as any);
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
        // Legend props
        selectedColorItems: selectedColorItems,
        selectedShapeItems: selectedShapeItems,
        onColorLegendClick: handleColorLegendClick,
        onShapeLegendClick: handleShapeLegendClick,
        onResetLegendSelections: handleResetLegendSelections,
      } as any);
    }
    return content;
  };

  // If no tabs provided, just render children with improved layout
  if (!tabs) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-lg font-medium text-center text-black">
            {title}
          </h4>
        </div>
        <div className="px-4 pb-4">{children}</div>
        {bottomContent && <div className="px-4 pb-4">{bottomContent}</div>}
      </div>
    );
  }

  // Check if we should use side-by-side layout
  const isSideBySide =
    viewportWidth >= SIDE_BY_SIDE_BREAKPOINT && tabs.length === 2;

  // Side-by-side layout using flexbox
  if (isSideBySide) {
    // Find the Timeline and Variability tabs
    const timelineTab = tabs.find((tab) => tab.id === "timeline");
    const variabilityTab = tabs.find((tab) => tab.id === "variability");

    if (timelineTab && variabilityTab) {
      return (
        <div className="bg-white rounded-lg shadow">
          {/* Shared title */}
          <div className="px-4 pt-4 pb-2">
            <h4 className="text-lg font-medium text-center text-black">
              {title}
            </h4>
          </div>

          {/* Side-by-side charts with flexible sizing */}
          <div className="flex gap-[5px] px-4 pb-4">
            {/* Timeline Chart - 55% of available space */}
            <div className="flex-[55] min-w-0">
              {injectZoomProps(timelineTab.content, undefined, true)}
            </div>

            {/* Variability Chart - 45% of available space */}
            <div className="flex-[45] min-w-0">
              {injectZoomProps(variabilityTab.content, undefined, true)}
            </div>
          </div>

          {bottomContent && <div className="px-4 pb-4">{bottomContent}</div>}
        </div>
      );
    }
  }

  // Render with tabs (narrow viewport)
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
              onClick={() => handleTabClick(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                border-b-2 -mb-px
                ${
                  activeTab === tab.id
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area - contains the chart which has zoom controls */}
      {/* In tabbed view, always reserve space for zoom controls */}
      <div className="px-4 pb-4">
        {tabs.map((tab) => {
          if (tab.id !== activeTab) return null;
          return <div key={tab.id}>{injectZoomProps(tab.content)}</div>;
        })}
      </div>

      {bottomContent && <div className="px-4 pb-4">{bottomContent}</div>}
    </div>
  );
}
