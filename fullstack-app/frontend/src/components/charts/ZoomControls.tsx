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
  // Only show when zoom is not at default (1x for all axes)
  if (xZoomLevel === 1 && yZoomLevel === 1 && (!y2ZoomLevel || y2ZoomLevel === 1)) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: -57, // Position 8px below tab group and 8px above chart SVG
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
        <span style={{
          color: '#6b7280', // Same color as instruction text
          fontWeight: '500'
        }}>
          <strong>Zoom:</strong> X: {xZoomLevel.toFixed(1)}x, Y: {yZoomLevel.toFixed(1)}x{y2ZoomLevel !== undefined ? `, Y2: ${y2ZoomLevel.toFixed(1)}x` : ''}
        </span>
        <button
          onClick={onResetZoom}
          style={{
            padding: '2px 6px',
            fontSize: '10px',
            border: '1px solid #6b7280',
            borderRadius: '3px',
            background: '#f9fafb',
            cursor: 'pointer',
            color: '#374151',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f9fafb';
          }}
        >
          Reset
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