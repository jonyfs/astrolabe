import { SkillModelConfig, SkillModelMap } from '../types/quality-distribution.js';

// Model capability tiers per AI-JEDI section 12
export type SkillTier = 'deep-reasoning' | 'balanced-coding' | 'fast-lightweight';
export type SkillCategory = 'speckit' | 'gstack';
export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

export interface SkillModelConfig {
  skill: string;
  category: SkillCategory;
  tier: SkillTier;
  model: string;
  effort: EffortLevel;
  description?: string;
}

// Model identifiers (resolved at runtime based on harness capabilities)
export const MODEL_DEEP_REASONING = 'deep-reasoning'; // Highest available
export const MODEL_BALANCED_CODING = 'balanced-coding'; // Default
export const MODEL_FAST_LIGHTWEIGHT = 'fast-lightweight'; // Cheapest

// Skill model mappings
export const SKILL_MODEL_MAP: Record<string, SkillModelConfig> = {
  // Spec Kit Skills
  specify: {
    skill: 'specify',
    category: 'speckit',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Requirements analysis and specification creation',
  },
  clarify: {
    skill: 'clarify',
    category: 'speckit',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Clarification questions and ambiguity resolution',
  },
  plan: {
    skill: 'plan',
    category: 'speckit',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Architecture design and implementation planning',
  },
  tasks: {
    skill: 'tasks',
    category: 'speckit',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Task breakdown and dependency analysis',
  },
  analyze: {
    skill: 'analyze',
    category: 'speckit',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Cross-artifact consistency and quality analysis',
  },
  checklist: {
    skill: 'checklist',
    category: 'speckit',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'Validation checklist generation',
  },
  implement: {
    skill: 'implement',
    category: 'speckit',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Code implementation from tasks',
  },
  converge: {
    skill: 'converge',
    category: 'speckit',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Implementation verification and gap analysis',
  },
  taskstoissues: {
    skill: 'taskstoissues',
    category: 'speckit',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'GitHub issue creation from tasks',
  },
  constitution: {
    skill: 'constitution',
    category: 'speckit',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Project principles and governance definition',
  },

  // gstack Skills
  benchmark: {
    skill: 'benchmark',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Performance benchmarking and regression detection',
  },
  'benchmark-models': {
    skill: 'benchmark-models',
    category: 'gstack',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'Cross-model benchmark comparison',
  },
  browse: {
    skill: 'browse',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Web browsing and QA testing',
  },
  canary: {
    skill: 'canary',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Post-deploy monitoring',
  },
  cso: {
    skill: 'cso',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Security audit and threat modeling',
  },
  careful: {
    skill: 'careful',
    category: 'gstack',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'Safety guardrails for destructive commands',
  },
  claude: {
    skill: 'claude',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Claude Code CLI second opinion',
  },
  codex: {
    skill: 'codex',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'OpenAI Codex CLI second opinion',
  },
  diagram: {
    skill: 'diagram',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Mermaid diagram generation',
  },
  'design-consultation': {
    skill: 'design-consultation',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Design system creation and consultation',
  },
  'design-html': {
    skill: 'design-html',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Production-quality HTML/CSS generation',
  },
  'design-review': {
    skill: 'design-review',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Visual design audit and polish',
  },
  'design-shotgun': {
    skill: 'design-shotgun',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Design exploration and variant generation',
  },
  'document-generate': {
    skill: 'document-generate',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Documentation generation from code',
  },
  'document-release': {
    skill: 'document-release',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Post-ship documentation updates',
  },
  health: {
    skill: 'health',
    category: 'gstack',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'Code quality dashboard and health checks',
  },
  investigate: {
    skill: 'investigate',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Root cause debugging and investigation',
  },
  learn: {
    skill: 'learn',
    category: 'gstack',
    tier: 'fast-lightweight',
    model: MODEL_FAST_LIGHTWEIGHT,
    effort: 'low',
    description: 'Project knowledge retrieval',
  },
  'office-hours': {
    skill: 'office-hours',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Product ideation and design brainstorming',
  },
  'plan-ceo-review': {
    skill: 'plan-ceo-review',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'CEO/founder-mode strategy review',
  },
  'plan-design-review': {
    skill: 'plan-design-review',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Designer-mode plan review',
  },
  'plan-devex-review': {
    skill: 'plan-devex-review',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Developer experience plan review',
  },
  'plan-eng-review': {
    skill: 'plan-eng-review',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Engineering manager-mode plan review',
  },
  qa: {
    skill: 'qa',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Full QA test and fix loop',
  },
  'qa-only': {
    skill: 'qa-only',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Report-only QA testing',
  },
  retro: {
    skill: 'retro',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Engineering retrospective',
  },
  review: {
    skill: 'review',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Pre-landing code review',
  },
  ship: {
    skill: 'ship',
    category: 'gstack',
    tier: 'balanced-coding',
    model: MODEL_BALANCED_CODING,
    effort: 'high',
    description: 'Release workflow and PR creation',
  },
  spec: {
    skill: 'spec',
    category: 'gstack',
    tier: 'deep-reasoning',
    model: MODEL_DEEP_REASONING,
    effort: 'max',
    description: 'Feature specification creation',
  },
};

export function getSkillConfig(skill: string): SkillModelConfig | undefined {
  return SKILL_MODEL_MAP[skill];
}

export function getSkillsByCategory(category: SkillCategory): SkillModelConfig[] {
  return Object.values(SKILL_MODEL_MAP).filter(s => s.category === category);
}

export function getSkillsByTier(tier: SkillTier): SkillModelConfig[] {
  return Object.values(SKILL_MODEL_MAP).filter(s => s.tier === tier);
}

export function getAllSkills(): SkillModelConfig[] {
  return Object.values(SKILL_MODEL_MAP);
}

export const skillModelMap: SkillModelMap = {
  skills: SKILL_MODEL_MAP,
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
};