'use client';

interface ZoomControlsProps {
  xZoomLevel: number;
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
  // Check if any axis is zoomed (not at 1.0x)
  const isZoomed = xZoomLevel !== 1 || yZoomLevel !== 1 || (y2ZoomLevel !== undefined && y2ZoomLevel !== 1);
  
  // Only show when zoom is not at default (1x for all axes)
  if (!isZoomed) {
    return null;
  }

  // Helper function to determine if a zoom level should be highlighted
  const getZoomStyle = (zoomLevel: number) => ({
    color: zoomLevel !== 1 ? '#dc2626' : '#6b7280',
    fontWeight: zoomLevel !== 1 ? '600' : '500'
  });

  return (
    <div 
      data-testid="zoom-controls"
      style={{
        position: 'absolute',
        top: -50, // Position much higher up, well above the chart area
        left: 10, // Position just inside the chart area, above y-axis
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        padding: '8px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        border: '1px solid #d1d5db',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        minWidth: '220px'
      }}
    >
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#6b7280', fontSize: '11px' }}>X:</span>
            <span 
              data-testid="x-zoom-level"
              style={getZoomStyle(xZoomLevel)}
            >
              {xZoomLevel.toFixed(1)}x
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#6b7280', fontSize: '11px' }}>Y:</span>
            <span 
              data-testid="y-zoom-level"
              style={getZoomStyle(yZoomLevel)}
            >
              {yZoomLevel.toFixed(1)}x
            </span>
          </div>
          
          {y2ZoomLevel !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#6b7280', fontSize: '11px' }}>Y2:</span>
              <span 
                data-testid="y2-zoom-level"
                style={getZoomStyle(y2ZoomLevel)}
              >
                {y2ZoomLevel.toFixed(1)}x
              </span>
            </div>
          )}
        </div>

        {isZoomed && (
          <button
            data-testid="reset-zoom-button"
            onClick={onResetZoom}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              border: '1px solid #dc2626',
              borderRadius: '4px',
              background: '#fef2f2',
              cursor: 'pointer',
              color: '#dc2626',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fef2f2';
            }}
            aria-label="Reset all axes zoom to 1x"
          >
            Reset Zoom
          </button>
        )}
      </div>
      
      <div style={{ 
        fontSize: '10px', 
        color: '#6b7280',
        lineHeight: '1.2',
        fontStyle: 'italic'
      }}>
        Scroll over X-axis or Y-axis to zoom
      </div>
    </div>
  );
}