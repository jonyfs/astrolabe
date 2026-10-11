export interface MarketplaceSpecs {
  icon: { widths: number[]; heights: number[]; formats: string[]; maxSizeKB: number };
  banner: { widths: number[]; heights: number[]; formats: string[]; maxSizeKB: number };
  screenshot: { widths: number[]; heights: number[]; formats: string[]; maxSizeKB: number };
  description: { maxChars: number; format: 'markdown' | 'html' | 'text' };
}

export const MARKETPLACE_SPECS: Record<string, MarketplaceSpecs> = {
  vscode: {
    icon: { widths: [128], heights: [128], formats: ['png'], maxSizeKB: 200 },
    banner: { widths: [1280], heights: [640], formats: ['png'], maxSizeKB: 500 },
    screenshot: { widths: [1280], heights: [720], formats: ['png'], maxSizeKB: 1000 },
    description: { maxChars: 5000, format: 'markdown' },
  },
  jetbrains: {
    icon: { widths: [128], heights: [128], formats: ['png'], maxSizeKB: 200 },
    banner: { widths: [1400], heights: [320], formats: ['png'], maxSizeKB: 500 },
    screenshot: { widths: [1600], heights: [900], formats: ['png'], maxSizeKB: 1000 },
    description: { maxChars: 4000, format: 'html' },
  },
  chrome: {
    icon: { widths: [128], heights: [128], formats: ['png'], maxSizeKB: 100 },
    banner: { widths: [1400], heights: [560], formats: ['png'], maxSizeKB: 500 },
    screenshot: { widths: [1280], heights: [800], formats: ['png'], maxSizeKB: 1000 },
    description: { maxChars: 16000, format: 'text' },
  },
};

export function getSpecs(marketplace: string, type: keyof MarketplaceSpecs): any {
  return MARKETPLACE_SPECS[marketplace]?.[type];
}

export function listMarketplaces(): string[] {
  return Object.keys(MARKETPLACE_SPECS);
}