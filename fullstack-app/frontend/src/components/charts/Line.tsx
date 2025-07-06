"use client";

import { useMemo } from "react";
import * as d3 from "d3";

interface LineProps {
  data: any[];
  xAccessor: (d: any) => number;
  yAccessor: (d: any) => number;
  groupBy?: (d: any) => string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeDasharray?: string;
}

export default function Line({
  data,
  xAccessor,
  yAccessor,
  groupBy,
  stroke = "#666666",
  strokeWidth = 1,
  strokeOpacity = 0.5,
  strokeDasharray = "none",
}: LineProps) {
  const lineGenerator = useMemo(() => {
    return d3
      .line<any>()
      .x(xAccessor)
      .y(yAccessor)
      .curve(d3.curveLinear)
      .defined((d) => !isNaN(xAccessor(d)) && !isNaN(yAccessor(d)));
  }, [xAccessor, yAccessor]);

  const groupedData = useMemo(() => {
    if (!groupBy) {
      // Single line for all data
      const sortedData = [...data].sort((a, b) => xAccessor(a) - xAccessor(b));
      return [{ key: "all", values: sortedData }];
    }

    // Group data by the groupBy function
    const groups = d3.group(data, groupBy);
    return Array.from(groups, ([key, values]) => ({
      key,
      values: [...values].sort((a, b) => xAccessor(a) - xAccessor(b)),
    }));
  }, [data, groupBy, xAccessor]);

  const paths = useMemo(() => {
    return groupedData.map(({ key, values }) => {
      const pathData = lineGenerator(values);
      return {
        key,
        path: pathData,
      };
    });
  }, [groupedData, lineGenerator]);

  return (
    <g className="lines">
      {paths.map(({ key, path }) => (
        <path
          key={key}
          d={path || ""}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          strokeDasharray={strokeDasharray}
        />
      ))}
    </g>
  );
}
