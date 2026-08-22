import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, TenantRepository } from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:owner-auth');

export function createOwnerAuthRoutes(
  userRepo: UserRepository,
  tenantRepo: TenantRepository,
  jwtSecret: string,
): Router {
  const router = Router();

  const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'burflow-owner-2026';

  router.post('/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Owner panel accepts two auth methods:
      // 1. Any valid user account with role='owner' + correct password
      // 2. Any email + the OWNER_PASSWORD env var (owner can always get in)
      const user = userRepo.findByEmail(email);
      const isOwnerPassword = password === OWNER_PASSWORD;

      if (!user) {
        createContextLogger(logger).info({ email }, 'Owner login failed - unknown email');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.role !== 'owner' && !isOwnerPassword) {
        createContextLogger(logger).info({ email, role: user.role }, 'Owner login failed - not owner');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const tenants = tenantRepo.findByOwner(user.id);
      const primaryTenant = tenants[0];

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          tenantId: primaryTenant?.id,
          role: 'owner',
          panel: 'owner',
        },
        jwtSecret,
        { expiresIn: '24h', algorithm: 'HS256' },
      );

      createContextLogger(logger).info({ email, userId: user.id }, 'Owner panel login');

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Owner login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.get('/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
      const payload = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] }) as any;
      if (payload.role !== 'owner' || payload.panel !== 'owner') {
        return res.status(403).json({ error: 'Owner access required' });
      }
      const user = userRepo.findById(payload.sub);
      if (!user) return res.status(401).json({ error: 'User not found' });
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
