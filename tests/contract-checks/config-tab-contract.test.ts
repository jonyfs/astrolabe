import { describe, it, expect } from 'vitest';
import { configSchema, getConfigSchema, getOptionSchema, createSchemaFromConfig } from '../../hooks/core/config-schema.js';
import { validateField, validateForm, validateFieldValue } from '../../hooks/core/config-validate.js';
import { ConfigOption } from '../../hooks/core/config-schema.js';

describe('Config Tab Contract', () => {
  it('should load config schema from plugin.json', () => {
    const schema = getConfigSchema();
    expect(schema).toBeDefined();
    expect(schema.options).toBeDefined();
    expect(schema.version).toBeDefined();
    expect(Object.keys(schema.options).length).toBeGreaterThan(0);
  });

  it('should have expected options from plugin.json', () => {
    const schema = getConfigSchema();
    expect(schema.options.preset).toBeDefined();
    expect(schema.options.flavor).toBeDefined();
    expect(schema.options.checkUpdates).toBeDefined();
    expect(schema.options.governUsage).toBeDefined();
    expect(schema.options.terse).toBeDefined();
  });

  it('should validate config option types', () => {
    const schema = getConfigSchema();
    
    // String options
    expect(schema.options.preset.type).toBe('enum');
    expect(schema.options.flavor.type).toBe('enum');
    expect(schema.options.language.type).toBe('enum');
    
    // Boolean options
    expect(schema.options.checkUpdates.type).toBe('boolean');
    expect(schema.options.governUsage.type).toBe('boolean');
    expect(schema.options.claudeContext.type).toBe('boolean');
    
    // Enum with options
    expect(schema.options.preset.enum).toContain('compact');
    expect(schema.options.flavor.enum).toContain('mocha');
  });

  it('should create Zod schema from config', () => {
    const schema = getConfigSchema();
    const zodSchema = createSchemaFromConfig(schema);
    expect(zodSchema).toBeDefined();
    
    // Test valid data
    const validData = {
      preset: 'compact',
      flavor: 'mocha',
      checkUpdates: true,
      governUsage: true,
    };
    const result = zodSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Config Field Validation', () => {
  it('should validate boolean field', () => {
    const option: ConfigOption = {
      key: 'test',
      type: 'boolean',
      default: true,
      description: 'Test option',
    };
    
    expect(validateField(option, true)).toBeUndefined();
    expect(validateField(option, false)).toBeUndefined();
    expect(validateField(option, 'true')).toBeDefined();
    expect(validateField(option, 1)).toBeDefined();
  });

  it('should validate number field with min/max', () => {
    const option: ConfigOption = {
      key: 'test',
      type: 'number',
      default: 50,
      description: 'Test option',
      min: 0,
      max: 100,
    };
    
    expect(validateField(option, 50)).toBeUndefined();
    expect(validateField(option, 0)).toBeUndefined();
    expect(validateField(option, 100)).toBeUndefined();
    expect(validateField(option, -1)).toBeDefined();
    expect(validateField(option, 101)).toBeDefined();
    expect(validateField(option, 'abc')).toBeDefined();
  });

  it('should validate enum field', () => {
    const option: ConfigOption = {
      key: 'test',
      type: 'enum',
      default: 'compact',
      description: 'Test option',
      enum: ['minimal', 'compact', 'full'],
    };
    
    expect(validateField(option, 'compact')).toBeUndefined();
    expect(validateField(option, 'minimal')).toBeUndefined();
    expect(validateField(option, 'invalid')).toBeDefined();
  });

  it('should validate form', () => {
    const schema = getConfigSchema();
    
    const validValues = {
      preset: 'compact',
      flavor: 'mocha',
      checkUpdates: true,
      governUsage: true,
    };
    
    const result = validateForm(schema, validValues);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should reject invalid form values', () => {
    const schema = getConfigSchema();
    
    const invalidValues = {
      preset: 'invalid',
      flavor: 'mocha',
      checkUpdates: true,
      governUsage: true,
    };
    
    const result = validateForm(schema, invalidValues);
    expect(result.valid).toBe(false);
    expect(result.errors.preset).toBeDefined();
  });
});