"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string; // ISO date string
  onChange?: (date: string) => void; // Returns ISO date string
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse date string as local date to avoid timezone issues
  const date = value
    ? (() => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : undefined;

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate && onChange) {
      // Convert to ISO date string (YYYY-MM-DD)
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, "0");
      const day = String(newDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else if (!newDate && onChange) {
      onChange("");
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
            "focus:outline-none focus:ring-blue-500 focus:border-blue-500",
            "text-sm bg-white text-black",
            "flex items-center justify-between",
            "hover:bg-gray-50 transition-colors",
            disabled && "bg-gray-100 text-gray-500 cursor-not-allowed",
            className,
          )}
          disabled={disabled}
        >
          <span className={!date ? "text-gray-400" : ""}>
            {date ? format(date, "PPP") : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-gray-600 ml-2 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(date) => {
            // Set time to midnight for date-only comparison
            const compareDate = new Date(date);
            compareDate.setHours(0, 0, 0, 0);

            if (minDate) {
              const minCompare = new Date(minDate);
              minCompare.setHours(0, 0, 0, 0);
              if (compareDate < minCompare) return true;
            }

            if (maxDate) {
              const maxCompare = new Date(maxDate);
              maxCompare.setHours(0, 0, 0, 0);
              if (compareDate > maxCompare) return true;
            }

            return false;
          }}
          initialFocus
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  );
}

