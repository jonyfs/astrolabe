import { PrivacyPolicy, PrivacySection, DataController } from '../types/quality-distribution.js';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';

export const PrivacyConfigSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  dataController: z.object({
    name: z.string(),
    address: z.string(),
    email: z.string(),
    dpoEmail: z.string().optional(),
  }),
  contactEmail: z.string(),
  jurisdictions: z.array(z.string()).default(['GDPR', 'CCPA']),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    requiredBy: z.array(z.string()).optional(),
  })),
});

export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;

export const REQUIRED_SECTIONS: PrivacySection[] = [
  {
    id: 'data-collected',
    title: 'Data We Collect',
    content: 'We collect the following categories of personal data: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'legal-basis',
    title: 'Legal Basis for Processing',
    content: 'Our legal bases for processing personal data include: ...',
    requiredBy: ['GDPR'],
  },
  {
    id: 'purpose',
    title: 'Purpose of Processing',
    content: 'We process personal data for the following purposes: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    content: 'We retain personal data for the following periods: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'sharing',
    title: 'Data Sharing and Disclosure',
    content: 'We may share personal data with: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'user-rights',
    title: 'Your Rights',
    content: 'You have the following rights regarding your personal data: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: 'To exercise your rights or for privacy inquiries, contact: ...',
    requiredBy: ['GDPR', 'CCPA'],
  },
  {
    id: 'transfers',
    title: 'International Transfers',
    content: 'Personal data may be transferred to: ...',
    requiredBy: ['GDPR'],
  },
  {
    id: 'automated-decision',
    title: 'Automated Decision Making',
    content: 'We do not use automated decision making that significantly affects you.',
    requiredBy: ['GDPR'],
  },
];

export async function loadPrivacyConfig(configPath: string): Promise<PrivacyConfig> {
  const content = await readFile(configPath, 'utf-8');
  const parsed = JSON.parse(content);
  return PrivacyConfigSchema.parse(parsed);
}

export function generatePrivacyPolicy(config: PrivacyConfig): string {
  const lines = [
    `# Privacy Policy`,
    '',
    `**Version**: ${config.version}`,
    `**Last Updated**: ${config.lastUpdated}`,
    `**Data Controller**: ${config.dataController.name}`,
    `**Contact**: ${config.contactEmail}`,
    `**Jurisdictions**: ${config.jurisdictions.join(', ')}`,
    '',
    '---',
    '',
  ];

  for (const section of config.sections) {
    lines.push(`## ${section.title}`, '', section.content, '');
  }

  lines.push('---', '', `*This policy is effective as of ${config.lastUpdated}.*`);

  return lines.join('\n');
}

export function validateCompliance(config: PrivacyConfig): { valid: boolean; missing: string[] } {
  const requiredIds = REQUIRED_SECTIONS.map(s => s.id);
  const presentIds = config.sections.map(s => s.id);
  const missing = requiredIds.filter(id => !presentIds.includes(id));
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function writePrivacyPolicy(
  outputPath: string,
  policy: string
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, policy);
}