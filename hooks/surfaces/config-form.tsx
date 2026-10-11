import { h } from '$';
import { ConfigSchema, ConfigOption } from '../core/config-schema.js';
import { validateForm, validateFieldValue } from '../core/config-validate.js';
import { ConfigField } from './config-field.js';

interface ConfigFormProps {
  schema: ConfigSchema;
  initialValues: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<{ success: boolean; errors?: Record<string, string> }>;
}

export function ConfigForm({ schema, initialValues, onSave }: ConfigFormProps) {
  const [values, setValues] = $state(initialValues);
  const [errors, setErrors] = $state<Record<string, string>>({});
  const [dirty, setDirty] = $state<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = $state(false);
  const [submitError, setSubmitError] = $state<string | undefined>();

  function handleChange(key: string, value: unknown) {
    setValues({ ...values, [key]: value });
    setDirty({ ...dirty, [key]: true });
    
    // Clear error on change
    if (errors[key]) {
      setErrors({ ...errors, [key]: undefined });
    }
  }

  function handleBlur(key: string) {
    const error = validateFieldValue(schema, key, values[key]);
    setErrors({ ...errors, [key]: error || undefined });
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(undefined);

    const validation = validateForm(schema, values);
    if (!validation.valid) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await onSave(values);
      if (result.success) {
        // Mod reload happens automatically via $.config.set
      } else {
        setSubmitError(result.errors ? JSON.stringify(result.errors) : 'Save failed');
        if (result.errors) setErrors(result.errors);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(schema.options).map(([key, option]) => (
          <ConfigField
            key={key}
            option={option}
            value={values[key] ?? option.default}
            onChange={(v) => handleChange(key, v)}
            onBlur={() => handleBlur(key)}
            error={errors[key]}
            dirty={dirty[key]}
          />
        ))}
      </div>
      
      {submitError && (
        <div style={{ color: 'var(--error)', padding: '8px', background: 'var(--error-bg)', borderRadius: '4px' }}>
          {submitError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          type="submit"
          disabled={isSubmitting || Object.keys(errors).length > 0}
          style={{
            padding: '8px 16px',
            background: isSubmitting || Object.keys(errors).length > 0 ? 'var(--muted)' : 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting || Object.keys(errors).length > 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
        {Object.keys(errors).length > 0 && (
          <span style={{ color: 'var(--error)', fontSize: '12px', alignSelf: 'center' }}>
            Fix errors before saving
          </span>
        )}
      </div>
    </form>
  );
}