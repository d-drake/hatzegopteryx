import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

interface UseBoxPlotZoomParams {
  /** Initial zoom domain from parent component */
  initialZoomDomain?: [number, number] | null;
  /** Original data extent for domain calculations */
  originalExtent: [number, number];
  /** Chart height for scale calculations */
  chartHeight: number;
  /** Responsive margin for mouse interaction detection */
  responsiveMargin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Callback when zoom domain changes */
  onZoomChange?: (domain: [number, number] | null) => void;
  /** Deprecated callback for scale changes */
  onScaleChange?: (scale: d3.ScaleLinear<number, number>) => void;
}

interface UseBoxPlotZoomReturn {
  /** Current zoom domain, null means no zoom applied */
  zoomDomain: [number, number] | null;
  /** Current effective extent (zoom domain or original extent) */
  currentExtent: [number, number];
  /** Reset zoom to original extent */
  resetZoom: () => void;
  /** Setup zoom event listeners on SVG element */
  setupZoomListeners: (svgElement: SVGSVGElement | null) => () => void;
}

/**
 * Custom hook to manage Y-axis zoom functionality for box plot charts
 * Handles wheel event detection, zoom calculations, and domain management
 */
export function useBoxPlotZoom({
  initialZoomDomain,
  originalExtent,
  chartHeight,
  responsiveMargin,
  onZoomChange,
  onScaleChange,
}: UseBoxPlotZoomParams): UseBoxPlotZoomReturn {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(
    initialZoomDomain || null,
  );

  // Update zoom domain when prop changes
  useEffect(() => {
    setZoomDomain(initialZoomDomain || null);
  }, [initialZoomDomain]);

  // Calculate current effective extent
  const currentExtent: [number, number] = zoomDomain || originalExtent;

  const resetZoom = () => {
    setZoomDomain(null);
    if (onZoomChange) {
      onZoomChange(null);
    }
  };

  const setupZoomListeners = (svgElement: SVGSVGElement | null) => {
    if (!svgElement) return () => {};

    const handleWheel = (event: WheelEvent) => {
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Check if mouse is over y-axis area (to the left of the chart, in the margin area)
      const isOverYAxis =
        mouseX >= 0 &&
        mouseX <= responsiveMargin.left &&
        mouseY >= responsiveMargin.top &&
        mouseY <= responsiveMargin.top + chartHeight;

      if (isOverYAxis) {
        event.preventDefault();
        event.stopPropagation();

        const zoomFactor = 1.2;
        const zoomIn = event.deltaY < 0;
        const scale = zoomIn ? zoomFactor : 1 / zoomFactor;

        // Zoom Y-axis by updating the domain state
        const [min, max] = currentExtent;
        const range = max - min;
        const center = min + range * 0.5;
        const newRange = range / scale;

        const newDomain: [number, number] = [
          center - newRange * 0.5,
          center + newRange * 0.5,
        ];
        setZoomDomain(newDomain);

        // Notify parent component of domain change
        if (onZoomChange) {
          onZoomChange(newDomain);
        }

        // Notify parent component of scale change (deprecated - for backward compatibility)
        if (onScaleChange) {
          const newScale = d3
            .scaleLinear()
            .domain(newDomain)
            .range([chartHeight, 0])
            .nice();
          onScaleChange(newScale);
        }
      }
    };

    // Add non-passive event listener directly to the SVG element
    svgElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      svgElement.removeEventListener("wheel", handleWheel);
    };
  };

  return {
    zoomDomain,
    currentExtent,
    resetZoom,
    setupZoomListeners,
  };
}
