'use client';

import { useEffect, useRef } from 'react';

interface ZoomControlsProps {
  xZoomLevel?: number;
  yZoomLevel: number;
  y2ZoomLevel?: number;
  onResetZoom: () => void;
}

export default function ZoomControls({ 
  xZoomLevel, 
  yZoomLevel, 
  y2ZoomLevel,
  onResetZoom 
}: ZoomControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Check if any axis is zoomed
  const isZoomed = (xZoomLevel !== undefined && xZoomLevel !== 1) || 
                   yZoomLevel !== 1 || 
                   (y2ZoomLevel !== undefined && y2ZoomLevel !== 1);

  // Prevent page scrolling when mouse is over zoom controls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Only show controls when zoomed
  if (!isZoomed) {
    return null;
  }

  return (
    <div ref={containerRef} className="zoom-controls" style={{
      position: 'absolute',
      top: -7, // Position just above the chart SVG to avoid overlap (adjusted for spacer)
      left: 0, // Align with left edge of chart/tab group
      zIndex: 10,
      background: 'rgba(255,255,255,0.95)',
      padding: '6px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      border: '1px solid #d1d5db',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      minWidth: '200px'
    }}>
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <span className="zoom-level" style={{
          color: '#6b7280', // Same color as instruction text
          fontWeight: '500'
        }}>
          <strong>Zoom:</strong> {xZoomLevel !== undefined ? `X: ${xZoomLevel.toFixed(1)}x, ` : ''}Y: {yZoomLevel.toFixed(1)}x{y2ZoomLevel !== undefined ? `, Y2: ${y2ZoomLevel.toFixed(1)}x` : ''}
        </span>
        <button
          onClick={onResetZoom}
          disabled={!isZoomed}
          style={{
            padding: '2px 6px',
            fontSize: '10px',
            border: '1px solid #6b7280',
            borderRadius: '3px',
            background: isZoomed ? '#f9fafb' : '#e5e7eb',
            cursor: isZoomed ? 'pointer' : 'default',
            color: isZoomed ? '#374151' : '#9ca3af',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            opacity: isZoomed ? 1 : 0.6
          }}
          onMouseEnter={(e) => {
            if (isZoomed) {
              e.currentTarget.style.background = '#f3f4f6';
            }
          }}
          onMouseLeave={(e) => {
            if (isZoomed) {
              e.currentTarget.style.background = '#f9fafb';
            }
          }}
        >
          Reset Zoom
        </button>
      </div>
      <div style={{ 
        fontSize: '10px', 
        color: '#6b7280', // Same as instruction text
        lineHeight: '1.2'
      }}>
        Scroll over X-axis or Y-axis to zoom
      </div>
    </div>
  );
}