import { useState, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import { storage } from '../../../lib/storage';
import { useAuth } from '../../../lib/auth-context';
import { deriveBusinessIntelligenceSnapshot } from '../../../utils/business-profile';

const STORAGE_KEY = 'onboarding_v2_progress';

export interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'ready' | 'error';
  progress: number;
  error?: string;
  sourceId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingData {
  currentStep: number;
  completedSteps: number[];
  workspace: {
    name: string;
    website: string;
    industry: string;
    tenantId: string | null;
    slug: string | null;
  };
  knowledge: {
    files: KnowledgeFile[];
    websites: string[];
    faqs: string;
    uploaded: boolean;
    knowledgeBaseId: string | null;
  };
  processing: {
    sourceIds: string[];
    completedIds: string[];
    statuses: Record<string, string>;
    error: string | null;
  };
  custom: {
    primaryColor: string;
    position: 'right' | 'left';
    welcomeMessage: string;
    placeholder: string;
    suggestedQuestions: string[];
    logo: string;
  };
  embed: {
    agentId: string;
    widgetToken: string | null;
    snippet: string | null;
    widgetVerified: boolean;
  };
  testMessages: ChatMessage[];
  demoDataLoaded: boolean;
  onboardingComplete: boolean;
}

const defaultData: OnboardingData = {
  currentStep: 0,
  completedSteps: [],
  workspace: { name: '', website: '', industry: '', tenantId: null, slug: null },
  knowledge: { files: [], websites: [], faqs: '', uploaded: false, knowledgeBaseId: null },
  processing: { sourceIds: [], completedIds: [], statuses: {}, error: null },
  custom: {
    primaryColor: '#6366f1', position: 'right',
    welcomeMessage: 'Hi there! How can I help you today?',
    placeholder: 'Type your message here…',
    suggestedQuestions: [], logo: '',
  },
  embed: { agentId: '', widgetToken: null, snippet: null, widgetVerified: false },
  testMessages: [],
  demoDataLoaded: false,
  onboardingComplete: false,
};

function loadSaved(): OnboardingData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultData, ...parsed, completedSteps: parsed.completedSteps || [] };
    }
  } catch {}
  return { ...defaultData };
}

export function useOnboardingState() {
  const [data, setData] = useState<OnboardingData>(loadSaved);
  const { refreshUser } = useAuth();
  const persist = useCallback((next: OnboardingData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('[Onboarding] Failed to persist state:', err);
    }
  }, []);

  const goToStep = useCallback((step: number) => {
    setData(prev => {
      const next = { ...prev, currentStep: Math.max(0, Math.min(step, 9)) };
      persist(next);
      return next;
    });
  }, [persist]);

  const markStepComplete = useCallback((step: number) => {
    setData(prev => {
      const completed = prev.completedSteps.includes(step) ? prev.completedSteps : [...prev.completedSteps, step];
      const next = { ...prev, completedSteps: completed, currentStep: Math.min(step + 1, 9) };
      console.log('[Onboarding] Step', step, 'completed, advancing to step', next.currentStep);
      persist(next);
      return next;
    });
  }, [persist]);

  const prevStep = useCallback(() => {
    setData(prev => {
      const next = { ...prev, currentStep: Math.max(0, prev.currentStep - 1) };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateWorkspace = useCallback((field: string, value: string) => {
    setData(prev => {
      const next = { ...prev, workspace: { ...prev.workspace, [field]: value } };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateCustom = useCallback((field: string, value: any) => {
    setData(prev => {
      const next = { ...prev, custom: { ...prev.custom, [field]: value } };
      persist(next);
      return next;
    });
  }, [persist]);

  const addFile = useCallback((file: KnowledgeFile) => {
    setData(prev => {
      const next = { ...prev, knowledge: { ...prev.knowledge, files: [...prev.knowledge.files, file] } };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateFileStatus = useCallback((name: string, patch: Partial<KnowledgeFile>) => {
    setData(prev => {
      const files = prev.knowledge.files.map(f => f.name === name ? { ...f, ...patch } : f);
      const next = { ...prev, knowledge: { ...prev.knowledge, files } };
      persist(next);
      return next;
    });
  }, [persist]);

  const removeFile = useCallback((name: string) => {
    setData(prev => {
      const files = prev.knowledge.files.filter(f => f.name !== name);
      const next = { ...prev, knowledge: { ...prev.knowledge, files } };
      persist(next);
      return next;
    });
  }, [persist]);

  const addWebsite = useCallback((url: string) => {
    setData(prev => {
      if (prev.knowledge.websites.includes(url)) return prev;
      const websites = [...prev.knowledge.websites, url];
      const next = { ...prev, knowledge: { ...prev.knowledge, websites } };
      persist(next);
      return next;
    });
  }, [persist]);

  const removeWebsite = useCallback((url: string) => {
    setData(prev => {
      const websites = prev.knowledge.websites.filter(w => w !== url);
      const next = { ...prev, knowledge: { ...prev.knowledge, websites } };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateFaqs = useCallback((faqs: string) => {
    setData(prev => {
      const next = { ...prev, knowledge: { ...prev.knowledge, faqs } };
      persist(next);
      return next;
    });
  }, [persist]);

  const addTestMessage = useCallback((msg: ChatMessage) => {
    setData(prev => {
      const testMessages = [...prev.testMessages, msg];
      const next = { ...prev, testMessages };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData({ ...defaultData });
  }, []);

  const createWorkspace = useCallback(async (): Promise<{ tenantId: string; slug: string }> => {
    try {
      const result = await apiClient.post<{ tenant: { id: string; slug: string }; token?: string }>('/tenants', {
        name: data.workspace.name,
        website: data.workspace.website,
        industry: data.workspace.industry,
      });
      const tenant = result.tenant;
      if (result.token) storage.setToken(result.token);
      try {
        await refreshUser();
      } catch {}
      setData(prev => {
        const next = {
          ...prev,
          workspace: { ...prev.workspace, tenantId: tenant.id, slug: tenant.slug },
          embed: { ...prev.embed, agentId: tenant.slug },
        };
        persist(next);
        return next;
      });
      return { tenantId: tenant.id, slug: tenant.slug };
    } catch (err: any) {
      const status = err?.status;
      if (typeof status === 'number' && status >= 400) {
        throw err;
      }
      const fallbackTenantId = `local-${Date.now()}`;
      const fallbackSlug = (data.workspace.name || 'local-workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'local-workspace';
      setData(prev => {
        const next = {
          ...prev,
          workspace: { ...prev.workspace, tenantId: fallbackTenantId, slug: fallbackSlug },
          embed: { ...prev.embed, agentId: fallbackSlug },
        };
        persist(next);
        return next;
      });
      return { tenantId: fallbackTenantId, slug: fallbackSlug };
    }
  }, [data.workspace.name, data.workspace.website, data.workspace.industry, persist, refreshUser]);

  const restoreWorkspace = useCallback(async (): Promise<void> => {
    const token = storage.getToken();
    if (!token) return;

    try {
      const result = await apiClient.get<{ tenants: Array<{ id: string; name: string; slug: string; autoCreated?: boolean }> }>('/tenants');
      const tenants = result.tenants || [];
      const markedWorkspace = tenants.find(t => t.autoCreated === false);
      const workspace = markedWorkspace || (tenants.length > 1 ? tenants[0] : null);
      if (!workspace) return;
      const session = await apiClient.post<{ tenant: { id: string; slug: string }; token?: string }>('/tenants', { name: workspace.name });
      if (session.token) storage.setToken(session.token);
      try {
        await refreshUser();
      } catch {}
      setData(prev => {
        if (prev.workspace.tenantId === workspace.id && prev.embed.agentId === workspace.slug) return prev;
        const next = {
          ...prev,
          workspace: { ...prev.workspace, name: workspace.name, tenantId: workspace.id, slug: workspace.slug },
          embed: { ...prev.embed, agentId: workspace.slug },
        };
        persist(next);
        return next;
      });
    } catch (err: any) {
      const status = err?.status;
      if (typeof status === 'number' && status >= 400) {
        throw err;
      }

      const fallbackTenantId = `local-${Date.now()}`;
      const fallbackSlug = 'local-workspace';
      setData(prev => {
        const next = {
          ...prev,
          workspace: { ...prev.workspace, tenantId: fallbackTenantId, slug: fallbackSlug },
          embed: { ...prev.embed, agentId: fallbackSlug },
        };
        persist(next);
        return next;
      });
    }
  }, [persist, refreshUser]);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    const fileEntry: KnowledgeFile = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
    };
    addFile(fileEntry);

    try {
      const result = await apiClient.uploadFile('/knowledge/upload', file, (pct) => {
        updateFileStatus(file.name, { progress: pct });
      });
      updateFileStatus(file.name, {
        status: 'uploaded',
        sourceId: (result as any).documentId || (result as any).sourceId || (result as any).id || 'unknown',
        progress: 100,
      });
      if ((result as any).knowledgeBaseId) {
        setData(prev => ({
          ...prev,
          knowledge: { ...prev.knowledge, knowledgeBaseId: (result as any).knowledgeBaseId, uploaded: true },
        }));
      }
    } catch (err: any) {
      updateFileStatus(file.name, {
        status: 'error',
        error: err.message || 'Upload failed',
      });
    }
  }, [addFile, updateFileStatus, setData, persist]);

  const submitFaqs = useCallback(async (): Promise<void> => {
    if (!data.knowledge.faqs.trim()) return;
    const faqLines = data.knowledge.faqs.split('\n').filter(l => l.trim());
    await apiClient.post('/knowledge/upload/faq', {
      filename: 'faq.txt',
      content: faqLines.join('\n'),
    });
  }, [data.knowledge.faqs]);

  const crawlWebsites = useCallback(async (onProgress?: (pages: number, remaining: number, maxPages: number) => void): Promise<Array<{ url: string; pagesCrawled: number; warning?: string | null }>> => {
    const results: Array<{ url: string; pagesCrawled: number; warning?: string | null }> = [];
    for (const url of data.knowledge.websites) {
      try {
        // Start polling progress in background
        let pollTimer: ReturnType<typeof setInterval> | null = null;
        if (onProgress) {
          pollTimer = setInterval(async () => {
            try {
              const p = await apiClient.get<{ active: boolean; pagesCrawled: number; queueRemaining: number; maxPages: number }>('/knowledge/crawl/progress');
              if (p && p.active) onProgress(p.pagesCrawled, p.queueRemaining, p.maxPages);
            } catch {}
          }, 1500);
        }
        try {
          const res = await apiClient.post<{ pagesCrawled?: number; warning?: string | null }>('/knowledge/crawl', { url, maxDepth: 10, maxPages: 500 });
          if (pollTimer) clearInterval(pollTimer);
          // Final progress update
          if (onProgress) onProgress(res.pagesCrawled || 0, 0, res.pagesCrawled || 0);
          results.push({ url, pagesCrawled: res.pagesCrawled || 0, warning: res.warning || null });
        } catch (err: any) {
          if (pollTimer) clearInterval(pollTimer);
          console.error('Crawl failed for', url, err);
          results.push({ url, pagesCrawled: 0, warning: err?.message || 'Failed to crawl this URL' });
        }
      } catch (err: any) {
        console.error('Crawl failed for', url, err);
        results.push({ url, pagesCrawled: 0, warning: err?.message || 'Failed to crawl this URL' });
      }
    }
    return results;
  }, [data.knowledge.websites]);

  const checkProcessingStatus = useCallback(async (): Promise<{ completed: boolean; statuses: Record<string, string> }> => {
    const result = await apiClient.get<{ sources: Array<{ id: string; status: string }> }>('/knowledge/sources');
    const sources = result.sources || [];
    const statuses: Record<string, string> = {};
    const completedIds: string[] = [];
    sources.forEach(s => {
      statuses[s.id] = s.status;
      if (s.status === 'ready' || s.status === 'published') completedIds.push(s.id);
    });
    const sourceIds = sources.map(s => s.id);
    const allReady = sources.length > 0 && sources.every(s => s.status === 'ready' || s.status === 'published');
    setData(prev => {
      const next = { ...prev, processing: { sourceIds, completedIds, statuses, error: null } };
      persist(next);
      return next;
    });
    return { completed: allReady, statuses };
  }, [persist]);

  const getBusinessProfile = useCallback(() => {
    return deriveBusinessIntelligenceSnapshot({
      businessName: data.workspace.name,
      industry: data.workspace.industry,
      knowledge: {
        files: data.knowledge.files,
        websites: data.knowledge.websites,
        faqs: data.knowledge.faqs,
        uploaded: data.knowledge.uploaded,
      },
      widgetInstalled: data.embed.widgetVerified,
      hasConversations: data.testMessages.length > 0,
      totalDocs: data.knowledge.files.length,
      totalSessions: data.testMessages.length,
    });
  }, [data.workspace.name, data.workspace.industry, data.knowledge.files, data.knowledge.websites, data.knowledge.faqs, data.knowledge.uploaded, data.embed.widgetVerified, data.testMessages.length]);

  const generateWidgetToken = useCallback(async (): Promise<string> => {
    const result = await apiClient.post<{ token: string }>('/widget/token');
    const token = result.token;
    setData(prev => {
      const next = { ...prev, embed: { ...prev.embed, widgetToken: token } };
      persist(next);
      return next;
    });
    return token;
  }, [data.embed.agentId, persist]);

  const updateWidgetConfig = useCallback(async (): Promise<void> => {
    await apiClient.put('/widget/config', {
      primaryColor: data.custom.primaryColor,
      position: data.custom.position,
      greeting: data.custom.welcomeMessage,
      launcherText: data.custom.placeholder,
      suggestedQuestions: data.custom.suggestedQuestions,
      logo: data.custom.logo,
      businessProfile: getBusinessProfile(),
    });
  }, [data.custom, getBusinessProfile]);

  const getWidgetSnippet = useCallback(async (): Promise<string> => {
    const snippet = await apiClient.getText(`/widget/snippet?token=${data.embed.widgetToken}`);
    setData(prev => {
      const next = { ...prev, embed: { ...prev.embed, snippet } };
      persist(next);
      return next;
    });
    return snippet;
  }, [data.embed.widgetToken, persist]);

  const verifyInstallation = useCallback(async (): Promise<boolean> => {
    const result = await apiClient.post<{ valid: boolean }>('/widget/verify', { token: data.embed.widgetToken });
    const active = Boolean(result.valid);
    setData(prev => {
      const next = { ...prev, embed: { ...prev.embed, widgetVerified: active } };
      persist(next);
      return next;
    });
    return active;
  }, [data.embed.widgetToken, persist]);

  const sendTestMessage = useCallback(async (message: string): Promise<ChatMessage> => {
    addTestMessage({ role: 'user', content: message });
    const result = await apiClient.post<{ response?: string }>('/chat', {
      message,
      sessionId: 'onboarding-test',
    });
    const reply: ChatMessage = { role: 'assistant', content: result.response || "I'm not sure how to respond to that. Could you try asking something else?" };
    addTestMessage(reply);
    return reply;
  }, [addTestMessage, data.embed.agentId]);

  const seedDemoData = useCallback(async (): Promise<void> => {
    await apiClient.post('/onboarding/seed-demo-data');
    setData(prev => {
      const next = { ...prev, demoDataLoaded: true };
      persist(next);
      return next;
    });
  }, [persist]);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    await apiClient.put('/onboarding/progress', {
      completedSteps: data.completedSteps,
      currentStep: 9,
      businessType: data.workspace.industry,
      primaryWebsite: data.workspace.website,
      businessProfile: getBusinessProfile(),
      demoDataLoaded: true,
      widgetInstalled: data.embed.widgetVerified,
      completedAt: new Date().toISOString(),
    });
    setData(prev => {
      const next = { ...prev, currentStep: 9, completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8], onboardingComplete: true };
      persist(next);
      return next;
    });
  }, [getBusinessProfile, persist, data.completedSteps, data.workspace.industry, data.workspace.website, data.embed.widgetVerified]);

  return {
    data,
    goToStep, markStepComplete, prevStep,
    updateWorkspace, updateCustom,
    addFile, updateFileStatus, removeFile,
    addWebsite, removeWebsite, updateFaqs,
    addTestMessage, resetOnboarding,
    createWorkspace, restoreWorkspace, uploadFile: uploadFile as (file: File) => Promise<void>,
    submitFaqs, crawlWebsites, checkProcessingStatus,
    generateWidgetToken, updateWidgetConfig, getWidgetSnippet,
    verifyInstallation, sendTestMessage,
    getBusinessProfile, seedDemoData, completeOnboarding,
  };
}

export const STEPS = [
  { id: 'welcome', label: 'Welcome', time: '30 sec', step: 0 },
  { id: 'workspace', label: 'Workspace', time: '1 min', step: 1 },
  { id: 'knowledge', label: 'Knowledge', time: '3 min', step: 2 },
  { id: 'processing', label: 'Processing', time: '2 min', step: 3 },
  { id: 'customize', label: 'Customize', time: '2 min', step: 4 },
  { id: 'embed', label: 'Embed Code', time: '1 min', step: 5 },
  { id: 'verify', label: 'Verify', time: '1 min', step: 6 },
  { id: 'first-chat', label: 'First Chat', time: '1 min', step: 7 },
  { id: 'success', label: 'Done!', time: '', step: 8 },
];

export const INDUSTRIES = [
  'Technology', 'E-commerce', 'Healthcare', 'Finance', 'Education',
  'Real Estate', 'Travel', 'Hospitality', 'Legal', 'SaaS', 'Other',
];

export const WIDGET_POSITIONS = [
  { value: 'right' as const, label: 'Bottom Right' },
  { value: 'left' as const, label: 'Bottom Left' },
];
