import { Router, Request, Response } from 'express';
import { LeadRepository, TenantRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validateEmail, validateRequiredString, validateRequiredEnum, validationError } from '../middleware/validate';
import { getEmailService } from '../services/email';

const logger = createLogger('saas-api:public');

/**
 * BurFlow's own sales tenant. The landing page and marketing forms capture
 * inbound demand here, and the demo widget (burflow-saas) is the same tenant —
 * so these leads surface in the BurFlow sales dashboard's Lead Inbox.
 */
const SALES_TENANT_ID = 'burflow-saas';

const SOURCES = ['contact', 'demo', 'scan'] as const;

/**
 * Public inbound lead capture used by the marketing site:
 *   - /contact  (ContactForm): name + work email (+ company, message, volume)
 *   - /demo     (DemoPage booking): name + work email + company + slot details
 *   - / (landing scan CTA): website URL only (no email required)
 * No auth. Rate-limited at the mount point. Best-effort email notification to
 * SALES_NOTIFY_EMAIL when configured — a mail failure must never break capture.
 */
export function createPublicRoutes(leadRepo: LeadRepository, tenantRepo: TenantRepository): Router {
  const router = Router();

  router.post('/leads', requireJsonObject, (req: Request, res: Response) => {
    try {
      const { source, name, email, company, message, websiteUrl, teamSize, preferredDate, preferredTime, focus, volume } = req.body;

      const errors = [
        validateRequiredEnum(source, 'source', SOURCES as unknown as string[]),
      ].filter(Boolean);

      if (source === 'scan') {
        if (!websiteUrl || typeof websiteUrl !== 'string') {
          errors.push({ field: 'websiteUrl', message: 'Website URL is required for a scan lead' });
        }
      } else {
        const nameErr = validateRequiredString(name, 'name', { maxLength: 120 });
        const emailErr = validateEmail(email, 'email');
        if (nameErr) errors.push(nameErr);
        if (emailErr) errors.push(emailErr);
      }

      if (errors.length > 0) return validationError(res, errors as any);

      // Ensure BurFlow's own tenant exists (idempotent, SQLite + PostgreSQL).
      tenantRepo.ensureDemoTenant(SALES_TENANT_ID);

      const lead = leadRepo.create({
        tenantId: SALES_TENANT_ID,
        sessionId: `public-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        email: email || undefined,
        name: name || undefined,
        company: company || undefined,
        qualificationStatus: 'unqualified',
        leadScore: 0,
        buyingIntent: 'low',
        source: 'form',
        metadata: {
          source,
          message: message || undefined,
          websiteUrl: websiteUrl || undefined,
          teamSize: teamSize || undefined,
          preferredDate: preferredDate || undefined,
          preferredTime: preferredTime || undefined,
          focus: focus || undefined,
          volume: volume || undefined,
        },
      });

      const notifyTo = process.env.SALES_NOTIFY_EMAIL;
      if (notifyTo) {
        const summary = [
          `New BurFlow ${source} lead`,
          name ? `Name: ${name}` : null,
          email ? `Email: ${email}` : null,
          company ? `Company: ${company}` : null,
          websiteUrl ? `Website: ${websiteUrl}` : null,
          message ? `Message: ${message}` : null,
        ].filter(Boolean).join('\n');
        getEmailService().send({
          to: notifyTo,
          subject: `New ${source} lead from BurFlow site`,
          text: summary,
          html: `<pre>${summary.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
        }).catch((err: any) => {
          createContextLogger(logger).error({ err }, 'Sales notification email failed (non-fatal)');
        });
      }

      res.status(201).json({ id: lead.id, message: 'Lead captured' });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Public lead capture failed');
      res.status(500).json({ error: 'Failed to capture lead' });
    }
  });

  return router;
}
