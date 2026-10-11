import { h } from '$';
import { getConfigSchema } from '../core/config-schema.js';
import { ConfigForm } from './config-form.js';

export function ConfigTab() {
  const schema = getConfigSchema();
  const [values, setValues] = $state<Record<string, unknown>>({});
  const [loading, setLoading] = $state(true);

  // Load current config values
  async function loadConfig() {
    try {
      // In a real mod, this would use $.config.get or similar
      // For now, use defaults from schema
      const defaults: Record<string, unknown> = {};
      for (const [key, option] of Object.entries(schema.options)) {
        defaults[key] = option.default;
      }
      setValues(defaults);
    } catch (e) {
      console.error('Failed to load config:', e);
    } finally {
      setLoading(false);
    }
  }

  // Load on mount
  if (loading) {
    loadConfig();
  }

  async function handleSave(formValues: Record<string, unknown>) {
    // In a real mod, this would call $.config.set(key, value) for each changed value
    // For now, simulate the save
    console.log('Saving config:', formValues);
    
    // Simulate $.config.set calls
    for (const [key, value] of Object.entries(formValues)) {
      if (values[key] !== value) {
        console.log(`$.config.set('${key}', ${JSON.stringify(value)})`);
      }
    }
    
    // The mod engine will automatically reload when config changes
    return { success: true };
  }

  if (loading) {
    return <div style={{ padding: '16px', color: 'var(--muted)' }}>Loading config...</div>;
  }

  return (
    <div style={{ padding: '8px' }}>
      <ConfigForm
        schema={schema}
        initialValues={values}
        onSave={handleSave}
      />
    </div>
  );
}