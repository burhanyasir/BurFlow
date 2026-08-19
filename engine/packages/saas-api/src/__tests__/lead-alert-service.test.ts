import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { maybeTrigger } from '../services/lead-alert-service';

vi.mock('../services/email', () => ({
  getEmailService: () => ({ send: vi.fn().mockResolvedValue(undefined) }),
}));

const ORIGINAL_WEBHOOK = process.env.LEAD_ALERT_WEBHOOK_URL;

beforeEach(() => {
  delete process.env.LEAD_ALERT_WEBHOOK_URL;
});
afterEach(() => {
  if (ORIGINAL_WEBHOOK) {
    process.env.LEAD_ALERT_WEBHOOK_URL = ORIGINAL_WEBHOOK;
  } else {
    delete process.env.LEAD_ALERT_WEBHOOK_URL;
  }
  vi.restoreAllMocks();
});

describe('lead alert service', () => {
  it('sends a POST payload when LEAD_ALERT_WEBHOOK_URL is set', async () => {
    process.env.LEAD_ALERT_WEBHOOK_URL = 'https://example.com/lead-alert';

    const fetchSpy = vi.spyOn(global as any, 'fetch');
    maybeTrigger(
      'tenant-123',
      'qualification',
      { email: 'user@example.com' },
      'Visitor interested in pricing and demo',
      ['pricing', 'demo']
    );

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = (fetchSpy.mock.calls[0] as any);
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.tenantId).toBe('tenant-123');
    expect(body.funnelStage).toBe('qualification');
    expect(body.contact).toEqual({ email: 'user@example.com', phone: null });
    expect(body.conversationSummary).toBe('Visitor interested in pricing and demo');
    expect(body.topics).toEqual(['pricing', 'demo']);
    expect(typeof body.timestamp).toBe('string');
  });

  it('does nothing when LEAD_ALERT_WEBHOOK_URL is not set', async () => {
    // ensure env var is deleted (beforeEach handles this)

    const fetchSpy = vi.spyOn(global as any, 'fetch');
    maybeTrigger('tenant-456', 'closing', null, 'some summary', []);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('handles fetch errors gracefully without throwing', async () => {
    process.env.LEAD_ALERT_WEBHOOK_URL = 'https://example.com/lead-alert';

    const fetchSpy = vi.spyOn(global as any, 'fetch');
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    await maybeTrigger('tenant-789', 'booking', { phone: '+15551234567' }, 'booking intent', ['booking']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The service catches the error internally, so no exception propagates
    // (we just verify it didn't throw outside)
  });

  it('dispatches to slack, custom webhook and alert emails from tenant config', async () => {
    const fetchSpy = vi.spyOn(global as any, 'fetch');
    fetchSpy.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    await maybeTrigger('tenant-config', 'qualification', { email: 'lead@example.com' }, 'Interested in pricing', ['pricing'], {
      config: {
        slackWebhookUrl: 'https://hooks.slack.com/services/T1/B2/X3',
        customWebhookUrl: 'https://example.com/custom-hook',
        alertEmails: 'sales@example.com, ops@example.com',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const urls = fetchSpy.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://hooks.slack.com/services/T1/B2/X3');
    expect(urls).toContain('https://example.com/custom-hook');

    const slackCall = fetchSpy.mock.calls.find(([url]) => url === 'https://hooks.slack.com/services/T1/B2/X3') as any;
    const slackBody = JSON.parse(slackCall[1].body);
    expect(slackBody.text).toContain('Qualified lead alert');
    expect(slackBody.text).toContain('lead@example.com');

    const webhookCall = fetchSpy.mock.calls.find(([url]) => url === 'https://example.com/custom-hook') as any;
    const webhookBody = JSON.parse(webhookCall[1].body);
    expect(webhookBody.tenantId).toBe('tenant-config');
    expect(webhookBody.contact).toEqual({ email: 'lead@example.com', phone: null });
  });

  it('falls back to env webhook when no tenant config is provided', async () => {
    process.env.LEAD_ALERT_WEBHOOK_URL = 'https://example.com/env-hook';

    const fetchSpy = vi.spyOn(global as any, 'fetch');
    fetchSpy.mockResolvedValue({ ok: true, status: 200, text: async () => '' });

    await maybeTrigger('tenant-env', 'closing', null, 'summary', [], { config: null });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect((fetchSpy.mock.calls[0] as any)[0]).toBe('https://example.com/env-hook');
  });
});