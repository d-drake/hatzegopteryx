import * as d3 from 'd3';

export function createLinearScale(
  domain: [number, number],
  range: [number, number]
): d3.ScaleLinear<number, number> {
  return d3.scaleLinear().domain(domain).nice().range(range);
}

export function createTimeScale(
  domain: [Date, Date],
  range: [number, number]
): d3.ScaleTime<number, number> {
  return d3.scaleTime().domain(domain).nice().range(range);
}

export function createColorScale(
  categories: string[]
): d3.ScaleOrdinal<string, string> {
  return d3.scaleOrdinal(d3.schemeCategory10).domain(categories);
}

export function createShapeScale(
  categories: string[]
): d3.ScaleOrdinal<string, d3.SymbolType> {
  const shapes = [
    d3.symbolCircle,
    d3.symbolSquare,
    d3.symbolTriangle,
    d3.symbolDiamond,
    d3.symbolStar,
    d3.symbolCross,
    d3.symbolWye,
  ];
  
  return d3
    .scaleOrdinal<string, d3.SymbolType>()
    .domain(categories)
    .range(shapes.slice(0, Math.min(categories.length, shapes.length)));
}

export function getUniqueValues<T>(data: T[], field: keyof T): string[] {
  return Array.from(new Set(data.map(d => String(d[field]))));
}

export function getNumericExtent<T>(data: T[], field: keyof T): [number, number] {
  const values = data.map(d => Number(d[field]));
  return d3.extent(values) as [number, number];
}

export function getDateExtent<T>(data: T[], field: keyof T): [Date, Date] {
  const values = data.map(d => new Date(String(d[field])));
  return d3.extent(values) as [Date, Date];
}