import { FieldMappingRule, FieldMappings } from "./types";

/**
 * Evaluates a field mapping rule condition
 */
function evaluateCondition(
  condition: FieldMappingRule["condition"],
  fieldValue: string,
  ruleValue: string
): boolean {
  switch (condition) {
    case "equals":
      return fieldValue === ruleValue;
    case "contains":
      return fieldValue.includes(ruleValue);
    case "startsWith":
      return fieldValue.startsWith(ruleValue);
    case "endsWith":
      return fieldValue.endsWith(ruleValue);
    default:
      return false;
  }
}

/**
 * Applies field mapping rules to determine the effective field to use
 */
export function applyFieldMappingRules(
  rules: FieldMappingRule[] | undefined,
  context: Record<string, any>,
  defaultField: string | undefined
): string | undefined {
  if (!rules || rules.length === 0) {
    return defaultField;
  }

  for (const rule of rules) {
    const fieldValue = context[rule.field];
    if (
      fieldValue &&
      typeof fieldValue === "string" &&
      evaluateCondition(rule.condition, fieldValue, rule.value)
    ) {
      // If useField is a reference to a context field, resolve it
      return context[rule.useField] || rule.useField;
    }
  }

  return defaultField;
}

/**
 * Determines the effective color field based on configuration and rules
 */
export function getEffectiveColorField(
  fieldMappings: FieldMappings | undefined,
  context: Record<string, any>,
  defaultColorField: string | undefined
): string | undefined {
  return applyFieldMappingRules(
    fieldMappings?.colorFieldRules,
    context,
    defaultColorField
  );
}

/**
 * Determines the effective shape field based on configuration and rules
 */
export function getEffectiveShapeField(
  fieldMappings: FieldMappings | undefined,
  context: Record<string, any>,
  defaultShapeField: string | undefined
): string | undefined {
  return applyFieldMappingRules(
    fieldMappings?.shapeFieldRules,
    context,
    defaultShapeField
  );
}