import { useState, useCallback } from 'react';

interface BoxHoverData {
  type: 'box';
  entity: string;
  count: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

interface PointHoverData {
  type: 'point';
  entity: string;
  value: number;
  isOutlier: boolean;
  lot?: string;
  date_process?: string;
  [key: string]: any; // For additional data fields
}

interface MeanHoverData {
  type: 'mean';
  entity: string;
  mean: number;
}

export type HoverData = BoxHoverData | PointHoverData | MeanHoverData;

type HoverDataSetter<T extends HoverData> = Omit<T, 'type'>;

interface MousePosition {
  x: number;
  y: number;
}

interface UseBoxPlotInteractionsReturn {
  /** Currently hovered data, null if nothing is hovered */
  hoveredData: HoverData | null;
  /** Current mouse position for tooltip positioning */
  mousePosition: MousePosition | null;
  /** Set hover data for box plot elements */
  setBoxHover: (data: HoverDataSetter<BoxHoverData>, event: MouseEvent) => void;
  /** Set hover data for individual data points */
  setPointHover: (data: HoverDataSetter<PointHoverData>, event: MouseEvent) => void;
  /** Set hover data for mean markers */
  setMeanHover: (data: HoverDataSetter<MeanHoverData>, event: MouseEvent) => void;
  /** Clear all hover state */
  clearHover: () => void;
  /** Update mouse position from mouse events */
  updateMousePosition: (event: MouseEvent) => void;
}

/**
 * Custom hook to manage interactions and hover states for box plot charts
 * Handles hover data and mouse position tracking for tooltips
 */
export function useBoxPlotInteractions(): UseBoxPlotInteractionsReturn {
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [mousePosition, setMousePosition] = useState<MousePosition | null>(null);


  const setBoxHover = useCallback((data: HoverDataSetter<BoxHoverData>, event: MouseEvent) => {
    const element = event.target as Element;
    const rect = element.getBoundingClientRect();
    const position = { 
      x: rect.left + rect.width / 2, 
      y: rect.top 
    };
    
    setHoveredData({ type: 'box', ...data } as BoxHoverData);
    setMousePosition(position);
  }, []);

  const setPointHover = useCallback((data: HoverDataSetter<PointHoverData>, event: MouseEvent) => {
    const element = event.target as Element;
    const rect = element.getBoundingClientRect();
    const position = { 
      x: rect.left + rect.width / 2, 
      y: rect.top 
    };
    
    setHoveredData({ type: 'point', ...data } as PointHoverData);
    setMousePosition(position);
  }, []);

  const setMeanHover = useCallback((data: HoverDataSetter<MeanHoverData>, event: MouseEvent) => {
    const element = event.target as Element;
    const rect = element.getBoundingClientRect();
    const position = { 
      x: rect.left + rect.width / 2, 
      y: rect.top 
    };
    
    setHoveredData({ type: 'mean', ...data } as MeanHoverData);
    setMousePosition(position);
  }, []);

  const clearHover = useCallback(() => {
    setHoveredData(null);
    setMousePosition(null);
  }, []);

  const updateMousePosition = useCallback((event: MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  return {
    hoveredData,
    mousePosition,
    setBoxHover,
    setPointHover,
    setMeanHover,
    clearHover,
    updateMousePosition,
  };
}