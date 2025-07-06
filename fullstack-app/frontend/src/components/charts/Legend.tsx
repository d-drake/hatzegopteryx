"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface LegendItem {
  label: string;
  color?: string;
  shape?: d3.SymbolType;
}

interface LegendProps {
  title: string;
  items: LegendItem[];
  x?: number;
  y?: number;
  itemHeight?: number;
  symbolSize?: number;
  selectedItems?: Set<string>;
  onItemClick?: (label: string) => void;
  hasOtherSelections?: boolean;
}

export default function Legend({
  title,
  items,
  x = 0,
  y = 0,
  itemHeight = 20,
  symbolSize = 40,
  selectedItems,
  onItemClick,
  hasOtherSelections = false,
}: LegendProps) {
  const gRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!gRef.current) return;

    const g = d3.select(gRef.current);

    // Clear previous legend
    g.selectAll("*").remove();

    // Add title
    g.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(title);

    // Calculate the width needed for the longest text
    const tempText = g
      .append("text")
      .style("font-size", "12px")
      .style("visibility", "hidden");

    const maxTextWidth = Math.max(
      ...items.map((item) => {
        tempText.text(item.label);
        return tempText.node()?.getBBox().width || 0;
      }),
    );

    tempText.remove();

    // Panel width: from left edge to text end + padding
    const panelWidth = 15 + maxTextWidth + 12; // 15px for symbol area + text width + 12px right padding

    // Add items
    const legendItems = g
      .selectAll(".legend-item")
      .data(items)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${15 + i * itemHeight})`);

    // Add clickable background panels
    legendItems
      .append("rect")
      .attr("class", "legend-panel")
      .attr("x", 0)
      .attr("y", -8) // Small padding above
      .attr("width", panelWidth)
      .attr("height", itemHeight - 4) // Small padding below
      .style("fill", "transparent")
      .style("cursor", onItemClick ? "pointer" : "default")
      .on("mouseenter", function () {
        d3.select(this).style("fill", "rgba(0, 0, 0, 0.05)");
      })
      .on("mouseleave", function () {
        d3.select(this).style("fill", "transparent");
      })
      .on("click", function (event, d) {
        if (onItemClick) {
          onItemClick(d.label);
        }
      });

    // Add symbols or circles
    legendItems.each(function (d) {
      const item = d3.select(this);

      // Determine if this item should be transparent
      const hasSelections = selectedItems && selectedItems.size > 0;
      const isSelected = selectedItems && selectedItems.has(d.label);
      const shouldBeTransparent = hasSelections && !isSelected;
      const opacity = shouldBeTransparent ? 0.3 : 1;

      if (d.shape) {
        item
          .append("path")
          .attr("transform", "translate(5, 0)")
          .attr("d", d3.symbol().type(d.shape).size(symbolSize)())
          .style("fill", d.color || "gray")
          .style("opacity", opacity)
          .style("pointer-events", "none"); // Prevent interference with panel clicks
      } else {
        item
          .append("circle")
          .attr("cx", 5)
          .attr("cy", 0)
          .attr("r", 4)
          .style("fill", d.color || "gray")
          .style("opacity", opacity)
          .style("pointer-events", "none"); // Prevent interference with panel clicks
      }

      item
        .append("text")
        .attr("x", 15)
        .attr("y", 4)
        .style("font-size", "12px")
        .style("opacity", opacity)
        .style("pointer-events", "none") // Prevent interference with panel clicks
        .text(d.label);
    });
  }, [
    title,
    items,
    itemHeight,
    symbolSize,
    selectedItems,
    onItemClick,
    hasOtherSelections,
  ]);

  return (
    <g ref={gRef} transform={`translate(${x}, ${y})`} className="legend" />
  );
}
