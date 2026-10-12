import { describe, expect, test } from 'vitest';

import {
  PrivacyConfigSchema,
  REQUIRED_SECTIONS,
  generatePrivacyPolicy,
  validateCompliance,
} from '../../src/privacy/generator.js';
import type { PrivacyConfig } from '../../src/privacy/generator.js';

function config(overrides: Partial<PrivacyConfig> = {}): PrivacyConfig {
  return {
    version: '1.0.0',
    lastUpdated: '2026-01-01',
    dataController: { name: 'ACME', address: '1 St', email: 'dpo@acme.dev' },
    contactEmail: 'privacy@acme.dev',
    jurisdictions: ['GDPR', 'CCPA'],
    sections: REQUIRED_SECTIONS.map((s) => ({ ...s })),
    ...overrides,
  };
}

describe('PrivacyConfigSchema', () => {
  test('defaults jurisdictions to GDPR + CCPA', () => {
    const raw = {
      version: '1',
      lastUpdated: '2026',
      dataController: { name: 'X', address: 'Y', email: 'z@z.dev' },
      contactEmail: 'p@x.dev',
      sections: [],
    };
    const parsed = PrivacyConfigSchema.parse(raw);
    expect(parsed.jurisdictions).toEqual(['GDPR', 'CCPA']);
  });

  test('rejects config missing required top-level fields', () => {
    expect(() => PrivacyConfigSchema.parse({})).toThrow();
    expect(() =>
      PrivacyConfigSchema.parse({ version: '1', sections: [] })
    ).toThrow();
  });

  test('rejects a section missing content', () => {
    const raw = {
      version: '1',
      lastUpdated: '2026',
      dataController: { name: 'X', address: 'Y', email: 'z@z.dev' },
      contactEmail: 'p@x.dev',
      sections: [{ id: 'a', title: 'A' }],
    };
    expect(() => PrivacyConfigSchema.parse(raw)).toThrow();
  });
});

describe('validateCompliance', () => {
  test('complete config is valid with no missing sections', () => {
    const r = validateCompliance(config());
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
  });

  test('empty sections list reports every required section missing', () => {
    const r = validateCompliance(config({ sections: [] }));
    expect(r.valid).toBe(false);
    expect(r.missing).toHaveLength(REQUIRED_SECTIONS.length);
    expect(r.missing).toEqual(REQUIRED_SECTIONS.map((s) => s.id));
  });

  test('single missing section is detected by id', () => {
    const sections = config().sections.filter((s) => s.id !== 'retention');
    const r = validateCompliance(config({ sections }));
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(['retention']);
  });

  test('extra unknown sections do not affect validity', () => {
    const sections = [
      ...config().sections,
      { id: 'cookies', title: 'Cookies', content: 'we use cookies' },
    ];
    const r = validateCompliance(config({ sections }));
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
  });
});

describe('generatePrivacyPolicy', () => {
  test('output contains header metadata and footer', () => {
    const out = generatePrivacyPolicy(config());
    expect(out).toContain('# Privacy Policy');
    expect(out).toContain('**Version**: 1.0.0');
    expect(out).toContain('**Last Updated**: 2026-01-01');
    expect(out).toContain('**Data Controller**: ACME');
    expect(out).toContain('**Contact**: privacy@acme.dev');
    expect(out).toContain('**Jurisdictions**: GDPR, CCPA');
    expect(out).toContain('*This policy is effective as of 2026-01-01.*');
  });

  test('every section renders as a level-2 heading with content', () => {
    const out = generatePrivacyPolicy(config());
    for (const s of REQUIRED_SECTIONS) {
      expect(out).toContain(`## ${s.title}`);
      expect(out).toContain(s.content);
    }
    const headings = out.match(/^## /gm);
    expect(headings).toHaveLength(REQUIRED_SECTIONS.length);
  });

  test('empty sections produce a policy with no section headings', () => {
    const out = generatePrivacyPolicy(config({ sections: [] }));
    expect(out).toContain('# Privacy Policy');
    expect(out).not.toMatch(/^## /m);
  });

  test('single jurisdiction renders without a trailing comma', () => {
    const out = generatePrivacyPolicy(config({ jurisdictions: ['GDPR'] }));
    expect(out).toContain('**Jurisdictions**: GDPR');
    expect(out).not.toContain('GDPR,');
  });
});
