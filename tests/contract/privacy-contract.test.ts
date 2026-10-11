import { describe, it, expect } from 'vitest';
import { PrivacyPolicy, PrivacySection, DataController } from '../../src/types/quality-distribution.js';

describe('Privacy Contract', () => {
  it('should validate privacy policy structure', () => {
    const policy: PrivacyPolicy = {
      version: '1.0.0',
      lastUpdated: '2026-10-10',
      sections: [
        {
          id: 'data-collected',
          title: 'Data We Collect',
          content: 'We collect...',
          requiredBy: ['GDPR', 'CCPA'],
        },
      ],
      jurisdiction: ['GDPR', 'CCPA'],
      dataController: {
        name: 'Test Corp',
        address: '123 Test St',
        email: 'test@example.com',
      },
      contactEmail: 'privacy@example.com',
    };

    expect(policy.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(policy.sections.length).toBeGreaterThan(0);
    expect(policy.jurisdiction.length).toBeGreaterThan(0);
    expect(policy.dataController.name).toBeDefined();
    expect(policy.contactEmail).toContain('@');
  });

  it('should validate privacy section structure', () => {
    const section: PrivacySection = {
      id: 'data-collected',
      title: 'Data We Collect',
      content: 'We collect...',
      requiredBy: ['GDPR', 'CCPA'],
    };

    expect(section.id).toBeDefined();
    expect(section.title).toBeDefined();
    expect(section.content).toBeDefined();
  });

  it('should validate data controller structure', () => {
    const controller: DataController = {
      name: 'Test Corp',
      address: '123 Test St',
      email: 'test@example.com',
      dpoEmail: 'dpo@example.com',
    };

    expect(controller.name).toBeDefined();
    expect(controller.email).toContain('@');
  });
});