import { CaptureArtifact } from '../types/quality-distribution.js';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { chromium } from 'playwright';

export interface CaptureView {
  name: string;
  url: string;
  actions?: CaptureAction[];
  capture: CaptureConfig;
}

export interface CaptureAction {
  type: 'click' | 'type' | 'wait' | 'scroll';
  selector?: string;
  value?: string;
  duration?: number;
}

export interface CaptureConfig {
  type: 'screenshot' | 'video';
  duration?: number;
  viewport: { width: number; height: number; deviceScaleFactor?: number };
  selector?: string;
}

export interface CaptureLauncherOptions {
  appPath: string;
  views: CaptureView[];
  outputDir: string;
  browser?: 'chromium' | 'firefox' | 'webkit';
}

export async function launchAndCapture(
  options: CaptureLauncherOptions
): Promise<CaptureArtifact[]> {
  const { appPath, views, outputDir, browser = 'chromium' } = options;

  await mkdir(outputDir, { recursive: true });

  const browserInstance = await chromium.launch({ headless: true });
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  const results: CaptureArtifact[] = [];

  for (const view of views) {
    await page.goto(view.url, { waitUntil: 'networkidle' });

    if (view.actions) {
      for (const action of view.actions) {
        await performAction(page, action);
      }
    }

    if (view.capture.type === 'screenshot') {
      const artifact = await captureScreenshot(page, view, outputDir);
      results.push(artifact);
    } else if (view.capture.type === 'video') {
      const artifact = await captureVideo(page, view, outputDir);
      results.push(artifact);
    }
  }

  await browserInstance.close();

  return results;
}

async function performAction(page: any, action: CaptureAction): Promise<void> {
  switch (action.type) {
    case 'click':
      if (action.selector) {
        await page.click(action.selector);
      }
      break;
    case 'type':
      if (action.selector && action.value) {
        await page.fill(action.selector, action.value);
      }
      break;
    case 'wait':
      await page.waitForTimeout(action.duration || 1000);
      break;
    case 'scroll':
      if (action.selector) {
        await page.evaluate((sel: string) => {
          const el = document.querySelector(sel);
          if (el) el.scrollIntoView();
        }, action.selector);
      } else {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      }
      break;
  }
}

async function captureScreenshot(
  page: any,
  view: CaptureView,
  outputDir: string
): Promise<CaptureArtifact> {
  const outputPath = join(outputDir, `${view.name}.png`);
  
  const viewport = view.capture.viewport;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  if (view.capture.selector) {
    const element = await page.$(view.capture.selector);
    if (element) {
      await element.screenshot({ path: outputPath });
    } else {
      await page.screenshot({ path: outputPath, fullPage: true });
    }
  } else {
    await page.screenshot({ path: outputPath, fullPage: true });
  }

  return {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'screenshot',
    view: view.name,
    outputPath,
    format: 'png',
    viewport,
    capturedAt: new Date().toISOString(),
  };
}

async function captureVideo(
  page: any,
  view: CaptureView,
  outputDir: string
): Promise<CaptureArtifact> {
  const outputPath = join(outputDir, `${view.name}.webm`);
  
  const viewport = view.capture.viewport;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  await page.video.start({ path: outputDir });

  if (view.capture.duration) {
    await page.waitForTimeout(view.capture.duration);
  } else {
    await page.waitForTimeout(5000);
  }

  await page.video.stop();

  return {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'video',
    view: view.name,
    outputPath,
    format: 'webm',
    viewport,
    durationMs: view.capture.duration || 5000,
    capturedAt: new Date().toISOString(),
  };
}

export async function loadCaptureViews(configPath: string): Promise<CaptureView[]> {
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}