/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetupWizard } from '../onboarding/setup-wizard';
import { getToasts } from '../core/toast';

describe('SetupWizard knowledge-source fallback', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('continues onboarding with a warning when knowledge ingestion fails', async () => {
    const api = {
      post: vi.fn().mockRejectedValue(new Error('crawl failed')),
      put: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({ progress: { completedSteps: [] } }),
    } as any;

    const wizard = new SetupWizard(api, {
      onComplete: vi.fn(),
      onClose: vi.fn(),
    });
    wizard.mount(container);

    (wizard as any).currentIndex = 5;
    (wizard as any).knowledgeMode = 'crawl';
    wizard.render();

    const input = wizard.getElement().querySelector('#wizard-crawl-url') as HTMLInputElement;
    input.value = 'https://example.com';

    const result = await (wizard as any).saveStep('knowledge_source');

    expect(result).toBe(true);
    expect(api.put).toHaveBeenCalledWith('/api/onboarding/progress', expect.objectContaining({ currentStep: null }));
    expect(getToasts().some((toast) => toast.type === 'warning' && toast.message.includes('basic setup'))).toBe(true);
  });
});
