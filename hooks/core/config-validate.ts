import { z } from 'zod';
import { ConfigOption, ConfigSchema, getOptionSchema, createSchemaFromConfig } from './config-schema.js';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateField(option: ConfigOption, value: unknown): string | undefined {
  const schema = getOptionSchema(option);
  const result = schema.safeParse(value);
  
  if (!result.success) {
    const error = result.error.errors[0];
    if (!error) return 'Invalid value';
    if (error.code === 'invalid_type') {
      return `Expected ${option.type}, received ${error.received}`;
    }
    if (error.code === 'invalid_enum_value') {
      return `Value must be one of: ${option.enum?.join(', ')}`;
    }
    if (error.code === 'too_small') {
      return `Value must be at least ${String(error.minimum)}`;
    }
    if (error.code === 'too_big') {
      return `Value must be at most ${String(error.maximum)}`;
    }
    return error.message;
  }
  
  return undefined;
}

export function validateForm(schema: ConfigSchema, values: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Only validate fields that are present in the values object
  for (const [key, value] of Object.entries(values)) {
    const option = schema.options[key];
    if (!option) continue;
    
    const error = validateField(option, value);
    if (error) {
      errors[key] = error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateFieldValue(schema: ConfigSchema, key: string, value: unknown): string | undefined {
  const option = schema.options[key];
  if (!option) return `Unknown option: ${key}`;
  return validateField(option, value);
}