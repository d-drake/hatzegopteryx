"use client";

import { useRef } from "react";
import { useResponsiveChartWidth } from "@/hooks/useResponsiveChartWidth";

interface ResponsiveChartWrapperProps {
  children: (width: number) => React.ReactNode;
  maxWidth?: number;
  padding?: number;
  className?: string;
  fallbackWidth?: number;
}

/**
 * Wrapper component that provides responsive width to chart components
 * Ensures charts are always smaller than their containers
 */
export default function ResponsiveChartWrapper({
  children,
  maxWidth = 800,
  padding = 32,
  className = "",
  fallbackWidth = 800,
}: ResponsiveChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, isCalculating } = useResponsiveChartWidth(containerRef, {
    maxWidth,
    padding,
  });

  return (
    <div ref={containerRef} className={className}>
      {isCalculating ? (
        // Show placeholder with fallback width while calculating
        <div
          style={{ width: fallbackWidth, height: 400 }}
          className="animate-pulse bg-gray-100 rounded"
        />
      ) : (
        children(width)
      )}
    </div>
  );
}
