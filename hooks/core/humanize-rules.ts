// Humanizer rules for prompt injection
export const HUMANIZER_RULES = `Write like a person:
- Plain prose, no hype words or inflated claims
- Active voice, avoid passive constructions  
- Be specific: name sources, avoid vague attributions
- Varied sentence structure, avoid repetitive patterns
- Skip filler words and em dashes, get to the point
- Facts exact, no hallucinated details`;

export function getHumanizerRules(): string {
  return HUMANIZER_RULES;
}

export function shouldInjectHumanizer(humanizeEnabled: boolean): boolean {
  return humanizeEnabled === true;
}

export function injectHumanizerRules(prompt: string, humanizeEnabled: boolean): string {
  if (!shouldInjectHumanizer(humanizeEnabled)) {
    return prompt;
  }
  
  const rules = getHumanizerRules();
  return `${prompt}\n\n${rules}`;
}