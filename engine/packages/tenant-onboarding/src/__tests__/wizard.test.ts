import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Onboarding wizard full flow', () => {
  it('runs a full 7-step onboarding and returns tenant summary', async () => {
    // Start with step 1 payload
    const startRes = await request(app).post('/wizard/start').send({ companyName: 'BurFlow Ltd', website: 'https://burflow.io', country: 'US', language: 'en', timezone: 'UTC' });
    expect(startRes.status).toBe(201);
    const { wizardId } = startRes.body;
    expect(wizardId).toBeTruthy();

    // Step 2: business type
    const step2 = await request(app).post(`/wizard/${wizardId}/step/2`).send({ type: 'SaaS' });
    expect(step2.status).toBe(200);

    // Resume and check progress
    const stateRes = await request(app).get(`/wizard/${wizardId}/state`).send();
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.progress).toBeTruthy();
    expect(stateRes.body.progress.percent).toBeGreaterThanOrEqual(0);

    // Step 3: products
    const products = [{ name: 'Pro', description: 'Pro plan', category: 'SaaS', price: 49.99, url: 'https://buy' }];
    const step3 = await request(app).post(`/wizard/${wizardId}/step/3`).send({ products });
    expect(step3.status).toBe(200);

    // Step 4: knowledge (if website present)
    const docs = [{ filename: 'faq.csv', type: 'csv' }];
    const step4 = await request(app).post(`/wizard/${wizardId}/step/4`).send({ docs });
    expect(step4.status).toBe(200);

    // Step 5: widget - expect preview returned
    const widget = { position: 'bottom-right', theme: 'light', color: '#00f', welcome: 'Hi there' };
    const step5 = await request(app).post(`/wizard/${wizardId}/step/5`).send(widget);
    expect(step5.status).toBe(200);
    expect(step5.body.preview).toBeTruthy();
    expect(step5.body.preview.widget.color).toBe('#00f');

    // Preview endpoint
    const previewRes = await request(app).get(`/wizard/${wizardId}/preview`).send();
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview.widget.welcome).toBe('Hi there');

    // Step 6: AI behavior
    const ai = { mode: 'hybrid', tone: 'friendly', responseLength: 'short', emojiUsage: false };
    const step6 = await request(app).post(`/wizard/${wizardId}/step/6`).send(ai);
    expect(step6.status).toBe(200);

    // Step 7: install (generate snippet request)
    const install = { domain: 'burflow.io' };
    const step7 = await request(app).post(`/wizard/${wizardId}/step/7`).send(install);
    expect(step7.status).toBe(200);

    // Complete
    const complete = await request(app).post(`/wizard/${wizardId}/complete`).send();
    expect(complete.status).toBe(201);
    expect(complete.body.tenantId).toBeTruthy();
    expect(complete.body.apiKey).toBeTruthy();
    expect(complete.body.business.companyName).toBe('BurFlow Ltd');
    expect(Array.isArray(complete.body.products)).toBe(true);
    expect(complete.body.install).toBeTruthy();
    expect(typeof complete.body.install.widgetSnippet).toBe('string');
  });
});
