/**
 * Generic field formatting utilities for chart labels and display names
 */

export interface FieldFormatterOptions {
  /** Maximum length before abbreviation is applied */
  maxLength?: number;
  /** Whether to apply abbreviation logic for long field names */
  abbreviate?: boolean;
  /** Custom text replacements to apply */
  textReplacements?: Record<string, string>;
  /** Whether to convert underscores to spaces */
  convertUnderscores?: boolean;
}

export interface UnitMapping {
  [fieldName: string]: string;
}

/**
 * Default formatting options for different use cases
 */
export const defaultFormatterOptions: Record<string, FieldFormatterOptions> = {
  timeline: {
    maxLength: 15,
    abbreviate: true,
    textReplacements: { x_y: "x-y" },
    convertUnderscores: true,
  },
  tooltip: {
    maxLength: Infinity,
    abbreviate: false,
    textReplacements: {
      Cd: "CD",
      Att: "ATT",
      "X Y": "X-Y",
      x_y: "x-y",
    },
    convertUnderscores: true,
  },
  axis: {
    maxLength: Infinity,
    abbreviate: false,
    textReplacements: { x_y: "x-y" },
    convertUnderscores: true,
  },
};

/**
 * Formats a field name with optional unit mapping and formatting options
 * Units are protected from abbreviation and always display completely
 */
export function formatFieldName(
  field: string,
  unitMapping?: UnitMapping,
  options: FieldFormatterOptions = defaultFormatterOptions.timeline,
): string {
  let formattedField = field;

  // Determine if this field has a unit
  const hasUnit = unitMapping && Object.keys(unitMapping).includes(field);
  const unitPortion = hasUnit ? ` (${unitMapping[field]})` : "";

  // Apply custom text replacements BEFORE underscore conversion
  if (options.textReplacements) {
    for (const [search, replace] of Object.entries(options.textReplacements)) {
      formattedField = formattedField.replace(new RegExp(search, "g"), replace);
    }
  }

  // Convert underscores to spaces
  if (options.convertUnderscores) {
    formattedField = formattedField.replace(/_/g, " ");
  }

  // Apply abbreviation logic for long field names (BEFORE adding unit)
  if (options.abbreviate && formattedField.length > (options.maxLength || 15)) {
    formattedField = formattedField
      .split(" ")
      .map((word: string) => {
        if (word.length <= 4) {
          return word;
        } else {
          return word.slice(0, 4) + ".";
        }
      })
      .join(" ");
  }

  // Add unit portion AFTER abbreviation to protect it from truncation
  return formattedField + unitPortion;
}

/**
 * Applies title case formatting to field names
 */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Convenience function for timeline-specific formatting
 */
export function formatTimelineFieldName(
  field: string,
  unitMapping?: UnitMapping,
): string {
  return formatFieldName(field, unitMapping, defaultFormatterOptions.timeline);
}

/**
 * Convenience function for tooltip-specific formatting
 */
export function formatTooltipFieldName(
  field: string,
  unitMapping?: UnitMapping,
): string {
  const formatted = formatFieldName(
    field,
    unitMapping,
    defaultFormatterOptions.tooltip,
  );
  return toTitleCase(formatted);
}

/**
 * Convenience function for axis label formatting
 */
export function formatAxisFieldName(
  field: string,
  unitMapping?: UnitMapping,
): string {
  return formatFieldName(field, unitMapping, defaultFormatterOptions.axis);
}
