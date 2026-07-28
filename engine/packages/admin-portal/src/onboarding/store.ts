import type { OnboardingProgress, OnboardingStepId } from './types';

export type OnboardingListener = (progress: OnboardingProgress | null) => void;

let currentProgress: OnboardingProgress | null = null;
let listeners: OnboardingListener[] = [];

export function getOnboardingProgress(): OnboardingProgress | null {
  return currentProgress ? { ...currentProgress } : null;
}

export function setOnboardingProgress(progress: OnboardingProgress | null): void {
  currentProgress = progress ? { ...progress } : null;
  listeners.forEach(fn => fn(currentProgress));
}

export function onOnboardingChange(fn: OnboardingListener): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function isOnboardingComplete(): boolean {
  if (!currentProgress) return false;
  return currentProgress.completedSteps.length >= 8; // all 8 steps
}

export function getOnboardingPercent(): number {
  if (!currentProgress) return 0;
  return Math.round((currentProgress.completedSteps.length / 8) * 100);
}

export function hasCompletedStep(step: OnboardingStepId): boolean {
  if (!currentProgress) return false;
  return currentProgress.completedSteps.includes(step);
}

export function getNextIncompleteStep(): OnboardingStepId | null {
  if (!currentProgress) return 'workspace';
  const allSteps: OnboardingStepId[] = ['workspace', 'business_type', 'website', 'brand_color', 'logo', 'knowledge_source', 'widget_install', 'test_chatbot'];
  for (const step of allSteps) {
    if (!currentProgress.completedSteps.includes(step)) return step;
  }
  return null;
}
