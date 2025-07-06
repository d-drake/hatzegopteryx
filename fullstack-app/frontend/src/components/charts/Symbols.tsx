"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface SymbolsProps<T> {
  data: T[];
  xAccessor: (d: T) => number;
  yAccessor: (d: T) => number;
  colorAccessor?: (d: T) => string;
  shapeAccessor?: (d: T) => string;
  colorScale?: d3.ScaleOrdinal<string, string>;
  shapeScale?: d3.ScaleOrdinal<string, d3.SymbolType>;
  size?: number;
  opacity?: number;
  onHover?: (event: MouseEvent, datum: T | null) => void;
  selectedColorItems?: Set<string>;
  selectedShapeItems?: Set<string>;
}

export default function Symbols<T>({
  data,
  xAccessor,
  yAccessor,
  colorAccessor,
  shapeAccessor,
  colorScale,
  shapeScale,
  size = 64,
  opacity = 0.7,
  onHover,
  selectedColorItems,
  selectedShapeItems,
}: SymbolsProps<T>) {
  const gRef = useRef<SVGGElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);

    // Clear previous symbols
    g.selectAll(".symbol").remove();

    // Add symbols
    const symbols = g
      .selectAll(".symbol")
      .data(data)
      .enter()
      .append("path")
      .attr("class", "symbol")
      .attr("transform", (d) => `translate(${xAccessor(d)}, ${yAccessor(d)})`)
      .attr("d", (d) => {
        const symbolType =
          shapeScale && shapeAccessor
            ? shapeScale(shapeAccessor(d))
            : d3.symbolCircle;
        return d3.symbol().type(symbolType).size(size)();
      })
      .style("fill", (d) => {
        if (colorScale && colorAccessor) {
          return colorScale(colorAccessor(d));
        }
        return "#3b82f6"; // default blue
      })
      .style("opacity", (d) => {
        // Apply selection transparency
        const hasColorSelections =
          selectedColorItems && selectedColorItems.size > 0;
        const hasShapeSelections =
          selectedShapeItems && selectedShapeItems.size > 0;

        if (hasColorSelections || hasShapeSelections) {
          let isVisible = true;

          // Check color selection
          if (hasColorSelections && colorAccessor) {
            const colorValue = colorAccessor(d);
            isVisible = isVisible && selectedColorItems.has(colorValue);
          }

          // Check shape selection
          if (hasShapeSelections && shapeAccessor) {
            const shapeValue = shapeAccessor(d);
            isVisible = isVisible && selectedShapeItems.has(shapeValue);
          }

          return isVisible ? opacity : opacity * 0.3;
        }

        return opacity;
      })
      .style("stroke", "white")
      .style("stroke-width", 0.5)
      .style("cursor", "pointer");

    symbols
      .on("mouseover", function (event, d) {
        const index = data.indexOf(d);
        setHoveredIndex(index);
        d3.select(this).style("opacity", 1);
        if (onHover) onHover(event, d);
      })
      .on("mouseout", function (event, d) {
        setHoveredIndex(null);
        d3.select(this).style("opacity", () => {
          // Restore the selection-based opacity
          const hasColorSelections =
            selectedColorItems && selectedColorItems.size > 0;
          const hasShapeSelections =
            selectedShapeItems && selectedShapeItems.size > 0;

          if (hasColorSelections || hasShapeSelections) {
            let isVisible = true;

            // Check color selection
            if (hasColorSelections && colorAccessor) {
              const colorValue = colorAccessor(d);
              isVisible = isVisible && selectedColorItems.has(colorValue);
            }

            // Check shape selection
            if (hasShapeSelections && shapeAccessor) {
              const shapeValue = shapeAccessor(d);
              isVisible = isVisible && selectedShapeItems.has(shapeValue);
            }

            return isVisible ? opacity : opacity * 0.3;
          }

          return opacity;
        });
        if (onHover) onHover(event, null);
      });
  }, [
    data,
    xAccessor,
    yAccessor,
    colorAccessor,
    shapeAccessor,
    colorScale,
    shapeScale,
    size,
    opacity,
    onHover,
    selectedColorItems,
    selectedShapeItems,
  ]);

  return <g ref={gRef} className="symbols" />;
}
