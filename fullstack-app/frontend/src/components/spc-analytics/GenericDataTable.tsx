'use client';

import { useState, useMemo } from 'react';
import { SPCDataItem, ColumnConfig } from '@/types';

interface GenericDataTableProps<T extends SPCDataItem> {
  data: T[];
  columns: ColumnConfig[];
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export default function GenericDataTable<T extends SPCDataItem>({
  data,
  columns,
  pageSize = 50,
  loading = false,
  emptyMessage = 'No data available'
}: GenericDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('date_process');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortColumn];
      const bVal = (b as any)[sortColumn];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return sortDirection === 'asc' ? 1 : -1;

      // Handle dates
      if (sortColumn === 'date_process' || sortColumn === 'date_read') {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (!columns.find(col => col.key === column)?.sortable) return;

    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date_process' ? 'desc' : 'asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatCellValue = (value: any, column: ColumnConfig): string => {
    if (value == null) return '-';
    
    if (column.format) {
      return column.format(value);
    }
    
    // Default formatting
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    
    return String(value);
  };

  // Pagination controls component
  const PaginationControls = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="text-sm text-gray-700">
        Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Data Table</h2>
          <PaginationControls />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:text-gray-700' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : ''}`}>
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        {sortDirection === 'asc' ? (
                          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-${column.align || 'left'}`}
                    >
                      {formatCellValue((row as any)[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {paginatedData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <PaginationControls />
        </div>
      )}
    </div>
  );
}