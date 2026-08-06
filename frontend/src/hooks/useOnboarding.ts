import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

export interface OnboardingProgress {
  tenantId: string;
  completedSteps: string[];
  skippedSteps: string[];
  currentStep: string | null;
  completionPercentage: number;
  onboardingStatus: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  businessType?: string;
  primaryWebsite?: string;
  businessProfile?: Record<string, unknown>;
  demoDataLoaded: boolean;
  widgetInstalled: boolean;
  firstSuccessfulConversation?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface FirstSuccessDashboard {
  knowledgeUploaded: boolean;
  documentsIndexed: number;
  widgetInstalled: boolean;
  conversationsToday: number;
  averageConfidence: number;
  groundedAnswerRate: number;
  firstUnansweredQuestion: string | null;
  completionPercentage: number;
  currentStep: string | null;
  onboardingStatus: string;
}

export interface ActivationChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  order: number;
}

export interface ActivationChecklist {
  items: ActivationChecklistItem[];
}

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [dashboard, setDashboard] = useState<FirstSuccessDashboard | null>(null);
  const [checklist, setChecklist] = useState<ActivationChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, dashRes, checkRes] = await Promise.allSettled([
        apiClient.get<{ progress: OnboardingProgress }>('/onboarding/progress'),
        apiClient.get<FirstSuccessDashboard>('/onboarding/first-success-dashboard'),
        apiClient.get<ActivationChecklist>('/onboarding/activation-checklist'),
      ]);
      if (progRes.status === 'fulfilled') setProgress(progRes.value.progress);
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value);
      if (checkRes.status === 'fulfilled') setChecklist(checkRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const completeStep = useCallback(async (step: string) => {
    const res = await apiClient.post<{ progress: OnboardingProgress }>('/onboarding/progress/complete-step', { step });
    setProgress(res.progress);
  }, []);

  const skipStep = useCallback(async (step: string) => {
    const res = await apiClient.post<{ progress: OnboardingProgress }>('/onboarding/progress/skip-step', { step });
    setProgress(res.progress);
  }, []);

  const refresh = useCallback(() => { loadAll(); }, [loadAll]);

  return { progress, dashboard, checklist, loading, completeStep, skipStep, refresh };
}
