import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Tenant onboarding API vertical slice', () => {
  it('starts onboarding and completes flow', async () => {
    const startRes = await request(app).post('/onboarding/start').send({ businessName: 'Acme Inc', website: 'https://acme.example' });
    expect(startRes.status).toBe(201);
    const { onboardingId } = startRes.body;
    expect(onboardingId).toBeTruthy();

    const stepRes = await request(app).post(`/onboarding/${onboardingId}/step`).send({ companySize: '10-50' });
    expect(stepRes.status).toBe(200);

    const completeRes = await request(app).post(`/onboarding/${onboardingId}/complete`).send();
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.tenantId).toBeTruthy();
    expect(completeRes.body.subscription).toBeTruthy();
  });

  it('widget settings store and retrieve', async () => {
    const tenantId = 'tenant_test';
    const setRes = await request(app).post(`/widget/${tenantId}/settings`).send({ color: '#00f', position: 'bottom-right' });
    expect(setRes.status).toBe(200);
    const getRes = await request(app).get(`/widget/${tenantId}/settings`).send();
    expect(getRes.body.color).toBe('#00f');
  });

  it('knowledge ingestion endpoints', async () => {
    const res = await request(app).post('/knowledge/tenant_test/upload').send({ filename: 'doc.pdf' });
    expect(res.status).toBe(202);
    const { id } = res.body;
    const status = await request(app).get(`/knowledge/tenant_test/ingestions/${id}`).send();
    expect(status.status).toBe(200);
    expect(status.body.status).toBeDefined();
  });
});
