'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';

interface LegendItem {
  label: string;
  color?: string;
  shape?: d3.SymbolType;
}

interface HorizontalLegendProps {
  title: string;
  items: LegendItem[];
  selectedItems?: Set<string>;
  onItemClick?: (label: string) => void;
  hasOtherSelections?: boolean;
  className?: string;
}

export default function HorizontalLegend({
  title,
  items,
  selectedItems,
  onItemClick,
  hasOtherSelections = false,
  className = '',
}: HorizontalLegendProps) {
  // Create symbol paths for shape items
  const symbolPaths = useMemo(() => {
    const symbolGenerator = d3.symbol().size(40);
    return items.reduce((acc, item) => {
      if (item.shape) {
        acc[item.label] = symbolGenerator.type(item.shape)() || '';
      }
      return acc;
    }, {} as Record<string, string>);
  }, [items]);

  const handleItemClick = (label: string) => {
    if (onItemClick) {
      onItemClick(label);
    }
  };

  // Determine opacity for items
  const getItemOpacity = (label: string) => {
    const hasSelections = selectedItems && selectedItems.size > 0;
    const isSelected = selectedItems && selectedItems.has(label);
    const shouldBeTransparent = hasSelections && !isSelected;
    return shouldBeTransparent ? 0.3 : 1;
  };

  return (
    <div className={`horizontal-legend ${className}`}>
      <h4 className="text-xs font-bold text-gray-700 mb-1">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const opacity = getItemOpacity(item.label);
          const isClickable = !!onItemClick;
          
          return (
            <div
              key={item.label}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded
                ${isClickable ? 'cursor-pointer hover:bg-gray-100' : ''}
                transition-colors duration-150
              `}
              style={{ opacity }}
              onClick={() => handleItemClick(item.label)}
            >
              {/* Shape or Circle */}
              {item.shape ? (
                <svg width="12" height="12" className="flex-shrink-0">
                  <g transform="translate(6, 6)">
                    <path
                      d={symbolPaths[item.label]}
                      fill={item.color || 'gray'}
                    />
                  </g>
                </svg>
              ) : (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color || 'gray' }}
                />
              )}
              
              {/* Label */}
              <span className="text-xs text-gray-700">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}