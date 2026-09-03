import { Request, Response, NextFunction, RequestHandler } from 'express';
import { getPlanConfig, isUnlimited } from '@conversation-engine/saas-core';

export interface QuotaGuardOptions {
  getCurrentMonthConversations: (tenantId: string) => number;
  getPlan: (tenantId: string) => string | null;
  getConversationLimit?: (plan: string) => number;
  fallbackMessage?: string;
}

/**
 * Blocks chat traffic with HTTP 429 when the tenant's current-month
 * conversation count has reached the active plan's conversation limit.
 * Unlimited plans (limit >= UNLIMITED_THRESHOLD) pass through.
 */
export function createQuotaGuard(opts: QuotaGuardOptions): RequestHandler {
  const getLimit = opts.getConversationLimit || ((plan: string) => getPlanConfig(plan).conversationLimit);
  const fallbackMessage = opts.fallbackMessage
    || 'We have reached the conversation limit for this workspace this month. Please try again after the reset, or ask your account owner to upgrade the plan.';

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;
    if (!tenantId) return next();

    try {
      const plan = opts.getPlan(tenantId) || 'free';
      const limit = getLimit(plan);
      if (isUnlimited(limit)) return next();

      const used = opts.getCurrentMonthConversations(tenantId);
      if (used >= limit) {
        return res.status(429).json({
          error: 'Conversation limit reached for this billing period',
          code: 'CONVERSATION_QUOTA_EXCEEDED',
          limit,
          used,
          plan,
          upgradeUrl: '/dashboard/billing',
          message: fallbackMessage,
        });
      }
      next();
    } catch (err) {
      // Fail closed — reject if we can't verify quota
      console.error(`[QuotaGuard] DB error checking quota for tenant ${tenantId}:`, err);
      return res.status(503).json({
        error: 'Unable to verify conversation quota',
        code: 'QUOTA_CHECK_FAILED',
        message: 'The service is temporarily unable to verify your plan limits. Please try again shortly.',
      });
    }
  };
}
