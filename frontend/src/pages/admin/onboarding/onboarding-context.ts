import { useState, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import { storage } from '../../../lib/storage';
import { useAuth } from '../../../lib/auth-context';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
      if (prev.completedSteps.includes(step)) return prev;
      const completed = [...prev.completedSteps, step];
      const next = { ...prev, completedSteps: completed, currentStep: Math.min(step + 1, 9) };
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
  }, [data.workspace.name, data.workspace.website, data.workspace.industry, persist, refreshUser]);

  const restoreWorkspace = useCallback(async (): Promise<void> => {
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
    } catch {}
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
        sourceId: (result as any).sourceId || (result as any).id || 'unknown',
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
    await apiClient.post('/knowledge/upload/faq', { faqs: faqLines, knowledgeBaseId: data.knowledge.knowledgeBaseId });
  }, [data.knowledge.faqs, data.knowledge.knowledgeBaseId]);

  const crawlWebsites = useCallback(async (): Promise<void> => {
    for (const url of data.knowledge.websites) {
      await apiClient.post('/knowledge/crawl', { url, knowledgeBaseId: data.knowledge.knowledgeBaseId });
    }
  }, [data.knowledge.websites, data.knowledge.knowledgeBaseId]);

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

  const generateWidgetToken = useCallback(async (): Promise<string> => {
    const result = await apiClient.post<{ token: string }>('/widget/token', { agentId: data.embed.agentId });
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
      agentId: data.embed.agentId,
      primaryColor: data.custom.primaryColor,
      position: data.custom.position,
      welcomeMessage: data.custom.welcomeMessage,
      placeholder: data.custom.placeholder,
      suggestedQuestions: data.custom.suggestedQuestions,
      logo: data.custom.logo,
    });
  }, [data.embed.agentId, data.custom]);

  const getWidgetSnippet = useCallback(async (): Promise<string> => {
    const result = await apiClient.get<{ snippet: string }>(`/widget/snippet?token=${data.embed.widgetToken}`);
    const snippet = result.snippet;
    setData(prev => {
      const next = { ...prev, embed: { ...prev.embed, snippet } };
      persist(next);
      return next;
    });
    return snippet;
  }, [data.embed.widgetToken, persist]);

  const verifyInstallation = useCallback(async (): Promise<boolean> => {
    const result = await apiClient.post<{ active: boolean }>('/widget/verify', { token: data.embed.widgetToken });
    const active = result.active;
    setData(prev => {
      const next = { ...prev, embed: { ...prev.embed, widgetVerified: active } };
      persist(next);
      return next;
    });
    return active;
  }, [data.embed.widgetToken, persist]);

  const sendTestMessage = useCallback(async (message: string): Promise<ChatMessage> => {
    addTestMessage({ role: 'user', content: message });
    const result = await apiClient.post<{ reply: string }>('/chat', {
      message,
      sessionId: 'onboarding-test',
      agentId: data.embed.agentId,
    });
    const reply: ChatMessage = { role: 'assistant', content: result.reply || "I'm not sure how to respond to that. Could you try asking something else?" };
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
      demoDataLoaded: true,
      widgetInstalled: data.embed.widgetVerified,
      completedAt: new Date().toISOString(),
    });
    setData(prev => {
      const next = { ...prev, currentStep: 9, completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8], onboardingComplete: true };
      persist(next);
      return next;
    });
  }, [persist, data.completedSteps, data.workspace.industry, data.workspace.website, data.embed.widgetVerified]);

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
    seedDemoData, completeOnboarding,
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
