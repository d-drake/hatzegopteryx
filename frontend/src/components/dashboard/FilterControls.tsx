'use client';

interface FilterControlsProps {
  entities: string[];
  selectedEntity: string;
  onEntityChange: (entity: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (dateRange: { start: string; end: string }) => void;
}

export default function FilterControls({
  entities,
  selectedEntity,
  onEntityChange,
  dateRange,
  onDateRangeChange,
}: FilterControlsProps) {
  const handleClearFilters = () => {
    onEntityChange('');
    onDateRangeChange({ start: '', end: '' });
  };

  const hasActiveFilters = selectedEntity || dateRange.start || dateRange.end;

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="entity-select" className="text-sm font-medium text-gray-700">
            Entity:
          </label>
          <select
            id="entity-select"
            value={selectedEntity}
            onChange={(e) => onEntityChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Entities</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="start-date" className="text-sm font-medium text-gray-700">
            Start Date:
          </label>
          <input
            id="start-date"
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="end-date" className="text-sm font-medium text-gray-700">
            End Date:
          </label>
          <input
            id="end-date"
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {selectedEntity && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Entity: {selectedEntity}
                <button
                  onClick={() => onEntityChange('')}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            )}
            {dateRange.start && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                From: {dateRange.start}
                <button
                  onClick={() => onDateRangeChange({ ...dateRange, start: '' })}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 text-green-400 hover:text-green-600"
                >
                  ×
                </button>
              </span>
            )}
            {dateRange.end && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                To: {dateRange.end}
                <button
                  onClick={() => onDateRangeChange({ ...dateRange, end: '' })}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 text-green-400 hover:text-green-600"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}