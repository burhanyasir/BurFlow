import { describe, it, expect } from 'vitest';
import * as integration from '../services/integration';

describe('Admin Dashboard integration service (smoke)', () => {
  it('returns telemetry summary stub', async () => {
    const s = await integration.getTelemetrySummary();
    expect(s).toHaveProperty('activeConversations');
  });

  it('returns analytics stub', async () => {
    const a = await integration.getAnalytics();
    expect(a).toHaveProperty('daily');
  });

  it('returns conversation list stub', async () => {
    const c = await integration.getConversations();
    expect(Array.isArray(c)).toBe(true);
  });
});
