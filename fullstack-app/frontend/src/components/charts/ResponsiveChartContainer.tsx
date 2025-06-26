'use client';

import { useState, useEffect, useRef, ReactNode, RefObject } from 'react';

export interface ChartDimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

interface ResponsiveChartContainerProps {
  children: (dimensions: ChartDimensions) => ReactNode;
  minWidth?: number; // Default 375px based on testing
  fallbackComponent?: React.ComponentType<{ minWidth: number; currentWidth: number }>;
  onBreakpointChange?: (isNarrow: boolean) => void;
  className?: string;
}

// Hook for ResizeObserver functionality with debouncing
export const useContainerResize = (ref: RefObject<HTMLElement | null>, debounceMs: number = 100) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounce the dimension update
      debounceTimeoutRef.current = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions(prevDimensions => {
            // Only update if dimensions actually changed (prevent unnecessary re-renders)
            if (prevDimensions.width !== width || prevDimensions.height !== height) {
              return { width, height };
            }
            return prevDimensions;
          });
        }
      }, debounceMs);
    });
    
    resizeObserver.observe(ref.current);
    
    return () => {
      resizeObserver.disconnect();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [ref, debounceMs]);
  
  return dimensions;
};

// Calculate responsive dimensions based on breakpoint testing results
const calculateResponsiveDimensions = (containerWidth: number): ChartDimensions => {
  if (containerWidth >= 1024) {
    // Desktop: Full features - no overflow at this size
    return { 
      width: Math.min(800, containerWidth * 0.95), 
      height: 500, 
      margin: { top: 60, right: 200, bottom: 60, left: 70 } 
    };
  } else if (containerWidth >= 768) {
    // Tablet: Reduced legend space - critical 768px breakpoint fix
    return { 
      width: containerWidth * 0.90, 
      height: 450, 
      margin: { top: 50, right: 150, bottom: 50, left: 60 } 
    };
  } else if (containerWidth >= 640) {
    // Mobile large: Compact legend - Y2-axis overflow fix
    return { 
      width: containerWidth * 0.95, 
      height: 400, 
      margin: { top: 40, right: 120, bottom: 40, left: 50 } 
    };
  } else {
    // Mobile: Minimal margins - 375px major overflow prevention
    return { 
      width: containerWidth * 0.98, 
      height: 350, 
      margin: { top: 30, right: 80, bottom: 30, left: 40 } 
    };
  }
};

// Determine if current width should use narrow layout logic
const isNarrowViewport = (width: number): boolean => {
  return width < 768; // Critical breakpoint from testing
};

export default function ResponsiveChartContainer({
  children,
  minWidth = 375, // Based on breakpoint testing
  fallbackComponent: FallbackComponent,
  onBreakpointChange,
  className = "",
}: ResponsiveChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: containerWidth } = useContainerResize(containerRef);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track breakpoint changes
  useEffect(() => {
    if (containerWidth > 0 && onBreakpointChange) {
      const isNarrow = isNarrowViewport(containerWidth);
      onBreakpointChange(isNarrow);
    }
  }, [containerWidth, onBreakpointChange]);

  // Initialize after first render to avoid hydration issues
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Show loading state during SSR or initial render
  if (!isInitialized || containerWidth === 0) {
    return (
      <div 
        ref={containerRef} 
        className={`w-full min-h-[350px] flex items-center justify-center ${className}`}
      >
        <div className="text-gray-500 text-sm">Loading chart...</div>
      </div>
    );
  }

  // Show fallback if container is too narrow
  if (containerWidth < minWidth && FallbackComponent) {
    return (
      <div ref={containerRef} className={`w-full ${className}`}>
        <FallbackComponent minWidth={minWidth} currentWidth={containerWidth} />
      </div>
    );
  }

  // Calculate responsive dimensions based on current container width
  const dimensions = calculateResponsiveDimensions(containerWidth);

  return (
    <div 
      ref={containerRef} 
      className={`w-full overflow-hidden ${className}`}
      style={{ minHeight: dimensions.height }}
    >
      {children(dimensions)}
    </div>
  );
}

// Export utility functions for use in other components
export { calculateResponsiveDimensions, isNarrowViewport };