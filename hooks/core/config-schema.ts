import { z } from 'zod';
import pluginJson from '../../.claude-plugin/plugin.json' with { type: 'json' };

export interface ConfigOption {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  default: string | number | boolean | string[];
  description: string;
  enum?: string[];
  min?: number;
  max?: number;
}

// The known userConfig keys, so `schema.options.preset` & friends stay defined under
// noUncheckedIndexedAccess.
type KnownOptions = Record<
  | 'preset' | 'flavor' | 'checkUpdates' | 'governUsage' | 'governThresholds' | 'quietHours'
  | 'observeUsage' | 'icons' | 'language' | 'askOnLimit' | 'claudeContext' | 'featureSummary'
  | 'humanize' | 'terse' | 'skillModels' | 'accessible' | 'footerIn' | 'footerLines' | 'footerSource'
  | 'footerSeparator' | 'autoReload' | 'images' | 'pullRequest' | 'bandDensity' | 'liveRows',
  ConfigOption
>;

export interface ConfigSchema {
  options: Record<string, ConfigOption> & KnownOptions;
  version: string;
}

function inferType(option: any): 'string' | 'number' | 'boolean' | 'enum' {
  if (option.type === 'boolean') return 'boolean';
  if (option.type === 'number') return 'number';
  if (option.type === 'string' && option.options && Array.isArray(option.options)) return 'enum';
  return 'string';
}

function parseUserConfig(userConfig: Record<string, unknown>): ConfigSchema {
  const options: Record<string, ConfigOption> = {};

  for (const [key, value] of Object.entries(userConfig)) {
    const opt = value as any;
    const type = inferType(opt);

    const configOption: ConfigOption = {
      key,
      type,
      default: opt.default,
      description: opt.description || '',
    };

    if (type === 'enum' && opt.options) {
      configOption.enum = opt.options;
    }

    if (type === 'number') {
      if (opt.min !== undefined) configOption.min = opt.min;
      if (opt.max !== undefined) configOption.max = opt.max;
    }

    options[key] = configOption;
  }

  return {
    options: options as ConfigSchema['options'],
    version: pluginJson.version,
  };
}

export const configSchema = parseUserConfig(pluginJson.userConfig);

export function getConfigSchema(): ConfigSchema {
  return configSchema;
}

export function getOptionSchema(option: ConfigOption): z.ZodTypeAny {
  switch (option.type) {
    case 'boolean':
      return z.boolean();
    case 'number':
      let numSchema = z.number();
      if (option.min !== undefined) numSchema = numSchema.min(option.min);
      if (option.max !== undefined) numSchema = numSchema.max(option.max);
      return numSchema;
    case 'enum':
      if (option.enum) {
        return z.enum(option.enum as [string, ...string[]]);
      }
      return z.string();
    case 'string':
    default:
      return z.string();
  }
}

export function createSchemaFromConfig(schema: ConfigSchema): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, option] of Object.entries(schema.options)) {
    shape[key] = getOptionSchema(option).optional();
  }
  return z.object(shape);
}