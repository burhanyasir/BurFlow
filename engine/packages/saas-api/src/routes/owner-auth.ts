import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, TenantRepository, comparePassword } from '@conversation-engine/saas-core';
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

      const user = userRepo.findByEmail(email);
      const isOwnerPassword = password === OWNER_PASSWORD;

      let loginUserId: string;
      let loginUserName: string;

      if (user) {
        const isUserPassword = comparePassword(password, user.passwordHash);
        if (!isOwnerPassword && !isUserPassword) {
          createContextLogger(logger).info({ email }, 'Owner login failed - wrong password');
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        const tenants = tenantRepo.findByOwner(user.id);
        if (tenants.length === 0 && !isOwnerPassword) {
          createContextLogger(logger).info({ email }, 'Owner login failed - not a tenant owner');
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        loginUserId = user.id;
        loginUserName = user.name;
      } else if (isOwnerPassword) {
        loginUserId = 'owner-' + email;
        loginUserName = email.split('@')[0];
      } else {
        createContextLogger(logger).info({ email }, 'Owner login failed - unknown email');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          sub: loginUserId,
          email,
          name: loginUserName,
          tenantId: undefined,
          role: 'owner',
          panel: 'owner',
        },
        jwtSecret,
        { expiresIn: '24h', algorithm: 'HS256' },
      );

      createContextLogger(logger).info({ email, userId: loginUserId }, 'Owner panel login');

      res.json({
        token,
        user: { id: loginUserId, email, name: loginUserName },
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
      res.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
