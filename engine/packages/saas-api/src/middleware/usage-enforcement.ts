import { Request, Response, NextFunction } from 'express';
import { getPlanLimits } from '@conversation-engine/saas-core';

declare global {
  namespace Express {
    interface Request {
      planLimits?: ReturnType<typeof getPlanLimits>;
      currentUsage?: Record<string, number>;
    }
  }
}

export function enforcePlanLimits(metric: 'conversations' | 'documents' | 'knowledgeBases' | 'teamMembers' | 'apiCalls' | 'storageMb' | 'widgets') {
  return (req: Request, res: Response, next: NextFunction) => {
    const limits = req.planLimits;
    if (!limits) return next();

    if (limits[metric] >= 999999) return next();

    const current = req.currentUsage?.[metric] || 0;
    if (current >= limits[metric]) {
      return res.status(402).json({
        error: `Limit exceeded for ${metric}`,
        limit: limits[metric],
        current,
        upgradeUrl: '/dashboard/billing',
        message: `You have reached your ${metric} limit (${limits[metric]}). Upgrade your plan to continue.`,
      });
    }
    next();
  };
}

export function attachPlanLimits(getLimits: (tenantId: string) => ReturnType<typeof getPlanLimits>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.tenantId) {
      req.planLimits = getLimits(req.tenantId);
    }
    next();
  };
}

export function featureGate(feature: 'analytics' | 'customBranding' | 'prioritySupport') {
  return (req: Request, res: Response, next: NextFunction) => {
    const limits = req.planLimits;
    if (limits && !limits[feature]) {
      return res.status(403).json({
        error: `Feature "${feature}" is not available on your plan`,
        upgradeUrl: '/dashboard/billing',
        message: `Upgrade your plan to access ${feature}.`,
      });
    }
    next();
  };
}

export function getTrialStatus(trialEnd?: string): { onTrial: boolean; expired: boolean; daysLeft: number } {
  if (!trialEnd) return { onTrial: false, expired: false, daysLeft: 0 };
  const end = new Date(trialEnd).getTime();
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  return { onTrial: now < end, expired: now >= end, daysLeft };
}
