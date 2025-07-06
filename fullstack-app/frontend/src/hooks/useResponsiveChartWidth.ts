import { useEffect, useState, RefObject, useCallback } from "react";

interface UseResponsiveChartWidthOptions {
  maxWidth?: number;
  padding?: number;
  debounceMs?: number;
}

/**
 * Hook to calculate responsive chart width based on container size
 * Ensures chart is always smaller than its container
 */
export function useResponsiveChartWidth(
  containerRef: RefObject<HTMLElement | null>,
  options: UseResponsiveChartWidthOptions = {},
) {
  const {
    maxWidth = 800,
    padding = 32, // Default padding to account for container padding
    debounceMs = 150,
  } = options;

  const [width, setWidth] = useState<number>(maxWidth);
  const [isCalculating, setIsCalculating] = useState(true);

  const calculateWidth = useCallback(() => {
    if (!containerRef.current) {
      return maxWidth;
    }

    const containerWidth = containerRef.current.clientWidth;
    const availableWidth = containerWidth - padding;

    // Ensure we never exceed container width or max width
    const calculatedWidth = Math.min(maxWidth, Math.max(200, availableWidth)); // Min width of 200px

    return calculatedWidth;
  }, [containerRef, maxWidth, padding]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateWidth = () => {
      // Clear any pending updates
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce the calculation
      timeoutId = setTimeout(() => {
        const newWidth = calculateWidth();
        setWidth(newWidth);
        setIsCalculating(false);
      }, debounceMs);
    };

    // Initial calculation
    updateWidth();

    // Create ResizeObserver for container
    const resizeObserver = new ResizeObserver(updateWidth);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener("resize", updateWidth);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [containerRef, calculateWidth, debounceMs]);

  return {
    width,
    isCalculating,
    recalculate: () => {
      const newWidth = calculateWidth();
      setWidth(newWidth);
      return newWidth;
    },
  };
}
