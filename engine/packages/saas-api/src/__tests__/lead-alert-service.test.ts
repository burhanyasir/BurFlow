import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maybeTrigger } from '../services/lead-alert-service';

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
    fetchSpy.mockRejectedValueOnce(Promise.reject(new Error('Network error')));

    await maybeTrigger('tenant-789', 'booking', { phone: '+15551234567' }, 'booking intent', ['booking']);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The service catches the error internally, so no exception propagates
    // (we just verify it didn't throw outside)
  });
});