import { h } from '$';
import { ConfigOption } from '../core/config-schema.js';

interface ConfigFieldProps {
  option: ConfigOption;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  error?: string;
  dirty?: boolean;
}

export function ConfigField({ option, value, onChange, onBlur, error, dirty }: ConfigFieldProps) {
  const { key, type, description, enum: enumValues } = option;

  const renderField = () => {
    switch (type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value as string | number}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            onBlur={onBlur}
            min={option.min}
            max={option.max}
            style={{ width: '100px' }}
          />
        );
      case 'enum':
        return (
          <select
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            style={{ width: '200px' }}
          >
            {enumValues?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'string':
      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            style={{ width: '300px' }}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
        <span style={{ fontWeight: 500 }}>{key}</span>
        {dirty && <span style={{ color: 'var(--accent)', fontSize: '12px' }}>●</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>{renderField()}</div>
        <span style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '400px' }}>
          {description}
        </span>
      </div>
      {error && (
        <span style={{ color: 'var(--error)', fontSize: '12px', marginLeft: '208px' }}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}