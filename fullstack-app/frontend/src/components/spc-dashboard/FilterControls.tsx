"use client";

import { useState, useEffect, useCallback } from "react";
import { createSPCService } from "@/services/spcGenericService";
import { useAuth } from "@/contexts/AuthContext";
import { DatePicker } from "@/components/ui/date-picker";

export interface FilterState {
  entity: string;
  startDate: string;
  endDate: string;
}

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  loading?: boolean;
  spcMonitor: string;
}

export default function FilterControls({
  filters,
  onFiltersChange,
  loading = false,
  spcMonitor,
}: FilterControlsProps) {
  const [entities, setEntities] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [entitySupported, setEntitySupported] = useState(true);
  const { user } = useAuth();

  // Local state for date inputs to prevent immediate updates
  const [localStartDate, setLocalStartDate] = useState(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState(filters.endDate);

  const isGuest = !user;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight for consistent date comparisons

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const loadFilterOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      const spcService = createSPCService(spcMonitor);

      // Check if entity filtering is supported for this SPC monitor
      const supportsEntities = spcService.supportsEntityFiltering();
      setEntitySupported(supportsEntities);

      if (supportsEntities) {
        const entitiesData = await spcService.fetchEntities();
        setEntities(entitiesData);
      } else {
        setEntities([]);
      }
    } catch (error) {
      console.error("Error loading filter options:", error);
      setEntitySupported(false);
      setEntities([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [spcMonitor]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Sync local state with parent filters
  useEffect(() => {
    setLocalStartDate(filters.startDate);
    setLocalEndDate(filters.endDate);
  }, [filters.startDate, filters.endDate]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    // For guests, enforce date restrictions
    if (isGuest && (key === "startDate" || key === "endDate")) {
      if (key === "startDate" && value) {
        // Parse date string as local date to avoid timezone issues
        const [year, month, day] = value.split("-").map(Number);
        const selectedDate = new Date(year, month - 1, day);

        // Create thirty days ago at midnight local time
        const thirtyDaysAgoMidnight = new Date(today);
        thirtyDaysAgoMidnight.setDate(today.getDate() - 30);
        thirtyDaysAgoMidnight.setHours(0, 0, 0, 0);

        if (selectedDate < thirtyDaysAgoMidnight) {
          const year = thirtyDaysAgoMidnight.getFullYear();
          const month = String(thirtyDaysAgoMidnight.getMonth() + 1).padStart(
            2,
            "0",
          );
          const day = String(thirtyDaysAgoMidnight.getDate()).padStart(2, "0");
          value = `${year}-${month}-${day}`;
        }
      }
      if (key === "endDate" && value) {
        // Parse date string as local date to avoid timezone issues
        const [year, month, day] = value.split("-").map(Number);
        const selectedDate = new Date(year, month - 1, day);

        // Create tomorrow's date at midnight local time
        const tomorrowMidnight = new Date(today);
        tomorrowMidnight.setDate(today.getDate() + 1);
        tomorrowMidnight.setHours(0, 0, 0, 0);

        if (selectedDate > tomorrowMidnight) {
          const year = tomorrowMidnight.getFullYear();
          const month = String(tomorrowMidnight.getMonth() + 1).padStart(
            2,
            "0",
          );
          const day = String(tomorrowMidnight.getDate()).padStart(2, "0");
          value = `${year}-${month}-${day}`;
        }
      }
    }

    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleDateChange = (key: "startDate" | "endDate", value: string) => {
    // Update local state
    if (key === "startDate") {
      setLocalStartDate(value);
    } else {
      setLocalEndDate(value);
    }
    // Update filters
    handleFilterChange(key, value);
  };

  const clearFilters = () => {
    setLocalStartDate("");
    setLocalEndDate("");
    onFiltersChange({
      entity: entitySupported && entities.length > 0 ? entities[0] : "", // Use first entity if supported, otherwise empty
      startDate: "",
      endDate: "",
    });
  };

  if (loadingOptions) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Data Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
          disabled={loading}
        >
          Clear All
        </button>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 ${entitySupported ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"}`}
      >
        {/* Entity Filter - only show if supported */}
        {entitySupported && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity
            </label>
            <select
              value={filters.entity}
              onChange={(e) => handleFilterChange("entity", e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-black appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%236b7280%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.7rem_center] bg-no-repeat"
              disabled={loading}
              required
            >
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <DatePicker
            value={localStartDate}
            onChange={(date) => handleDateChange("startDate", date)}
            disabled={loading}
            minDate={isGuest ? thirtyDaysAgo : undefined}
            maxDate={isGuest ? tomorrow : undefined}
            placeholder="Select start date"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <DatePicker
            value={localEndDate}
            onChange={(date) => handleDateChange("endDate", date)}
            disabled={loading}
            minDate={isGuest ? thirtyDaysAgo : undefined}
            maxDate={isGuest ? tomorrow : undefined}
            placeholder="Select end date"
          />
        </div>
      </div>
    </div>
  );
}

