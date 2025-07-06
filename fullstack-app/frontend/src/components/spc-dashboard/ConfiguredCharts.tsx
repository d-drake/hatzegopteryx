"use client";

import React from "react";
import { useSPCConfig } from "@/hooks/useSPCConfig";
import SPCChartWithSharedData from "./SPCChartWithSharedData";
import { ChartConfig } from "@/lib/spc-dashboard/config/types";

interface ConfiguredChartsProps {
  spcMonitor: string;
  data: any[];
  processType: string;
  productType: string;
  syncViews: boolean;
  activeView: "timeline" | "variability";
  onViewChange: (view: "timeline" | "variability") => void;
  statisticsCollapsed: boolean;
  onToggleStatisticsCollapsed: () => void;
}

/**
 * Renders charts based on the configuration for a specific SPC monitor
 */
export default function ConfiguredCharts({
  spcMonitor,
  data,
  processType,
  productType,
  syncViews,
  activeView,
  onViewChange,
  statisticsCollapsed,
  onToggleStatisticsCollapsed,
}: ConfiguredChartsProps) {
  // Get chart configurations for this monitor
  const { charts } = useSPCConfig(spcMonitor);

  if (!charts || charts.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8">
        No charts configured for this monitor.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {charts.map((chart: ChartConfig) => (
        <SPCChartWithSharedData
          key={chart.id}
          title={chart.title}
          data={data}
          yField={chart.yAxis.field}
          y2Field={chart.y2Axis?.field}
          colorField={chart.colorField}
          shapeField={chart.shapeField}
          processType={processType}
          productType={productType}
          spcMonitor={spcMonitor}
          syncViews={syncViews}
          activeView={activeView}
          onViewChange={onViewChange}
          statisticsCollapsed={statisticsCollapsed}
          onToggleStatisticsCollapsed={onToggleStatisticsCollapsed}
        />
      ))}
    </div>
  );
}