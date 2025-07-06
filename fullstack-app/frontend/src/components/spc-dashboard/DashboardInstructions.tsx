"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function DashboardInstructions({
  className = "",
}: {
  className?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Check localStorage on mount
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("spc-dashboard-instructions-collapsed") === "true"
      );
    }
    return false; // Default to expanded for new users
  });

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "spc-dashboard-instructions-collapsed",
        isCollapsed.toString(),
      );
    }
  }, [isCollapsed]);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded-lg ${className}`}
    >
      <button
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        className="w-full p-4 flex justify-between items-center text-left hover:bg-blue-100 transition-colors duration-200 rounded-lg"
      >
        <span className="text-blue-800 font-medium">
          Interactive Dashboard Guide
        </span>
        {isCollapsed ? (
          <ChevronRightIcon className="h-5 w-5 text-blue-600" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-blue-600" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isCollapsed ? "max-h-0" : "max-h-96"
        }`}
      >
        <div
          className="px-4 pb-4 space-y-2"
          role="region"
          aria-label="Dashboard interaction instructions"
        >
          <p className="text-blue-800 text-sm mb-3">
            The SPC Data Dashboard is optimized for intelligent user
            interaction:
          </p>

          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start">
              <span className="mr-2 text-lg leading-5">🔍</span>
              <span>
                <strong>Zoom Controls:</strong> Scroll over axes to zoom.
              </span>
            </div>

            <div className="flex items-start">
              <span className="mr-2 text-lg leading-5">🎯</span>
              <span>
                <strong>Data Selection:</strong> Click legend item(s) to select
                groups. Click again to de-select.
              </span>
            </div>

            <div className="flex items-start">
              <span className="mr-2 text-lg leading-5">ℹ️</span>
              <span>
                <strong>Data Insights:</strong> Hover over data points for
                detailed info.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
