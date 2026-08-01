import request from 'supertest';
import app from '../../index';

export async function startWizard(payload = {}) {
  const res = await request(app).post('/wizard/start').send(payload);
  return res;
}

export async function submitStep(wizardId: string, stepNumber: number, payload: any) {
  const res = await request(app).post(`/wizard/${wizardId}/step/${stepNumber}`).send(payload);
  return res;
}

export async function getState(wizardId: string) {
  const res = await request(app).get(`/wizard/${wizardId}/state`).send();
  return res;
}

export async function resumeWizard(wizardId: string) {
  const res = await request(app).post(`/wizard/${wizardId}/resume`).send();
  return res;
}

export async function preview(wizardId: string) {
  const res = await request(app).get(`/wizard/${wizardId}/preview`).send();
  return res;
}

export async function uploadKnowledge(tenantId: string, details: any) {
  const res = await request(app).post(`/knowledge/${tenantId}/upload`).send(details);
  return res;
}

export async function getIngestion(tenantId: string, id: string) {
  const res = await request(app).get(`/knowledge/${tenantId}/ingestions/${id}`).send();
  return res;
}

export async function completeWizard(wizardId: string) {
  const res = await request(app).post(`/wizard/${wizardId}/complete`).send();
  return res;
}

export async function concurrentStarts(n: number) {
  const promises = [];
  for (let i = 0; i < n; i++) promises.push(startWizard({ companyName: `C${i}`, website: `https://example${i}.com` }));
  return Promise.all(promises);
}
