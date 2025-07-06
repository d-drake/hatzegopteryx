import { useEffect, useState } from "react";

/**
 * Hook to track viewport width with debounced updates
 * Returns the current viewport width
 */
export function useViewportWidth() {
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Clear any pending updates
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce the update by 150ms
      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
      }, 150);
    };

    // Set initial width
    setWidth(window.innerWidth);

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return width;
}
