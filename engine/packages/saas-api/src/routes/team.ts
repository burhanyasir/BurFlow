import { Router, Request, Response } from 'express';
import {
  TeamMemberRepository, InvitationRepository, ActivityRepository,
  TenantRepository, UserRepository,
  TeamRole, Invitation,
} from '@conversation-engine/saas-core';
import { createLogger, createContextLogger } from '@conversation-engine/logger';
import { requireJsonObject, validateRequiredString, validateRequiredEnum, validateEmail, validationError, validateUUID, LABEL_MAX } from '../middleware/validate';

const VALID_TEAM_ROLES = ['owner', 'admin', 'support_agent', 'viewer'];
const logger = createLogger('saas-api:team');

export function createTeamRoutes(
  teamRepo: TeamMemberRepository,
  invitationRepo: InvitationRepository,
  activityRepo: ActivityRepository,
  tenantRepo: TenantRepository,
  userRepo: UserRepository,
): Router {
  const router = Router();

  // Owner-only guard
  const ownerOnly = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Owner access required' });
    }
    next();
  };

  const adminOrOwner = (req: Request, res: Response, next: Function) => {
    if (!req.user?.role || !['admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin or owner access required' });
    }
    next();
  };

  // ── List Team Members ──

  router.get('/members', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const members = teamRepo.findByTenant(tenantId);
      res.json(members.map(m => ({
        id: m.id,
        userId: m.userId,
        email: m.email,
        name: m.name,
        role: m.role,
        joinedAt: m.joinedAt,
      })));
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List members failed');
      res.status(500).json({ error: 'Failed to list team members' });
    }
  });

  // ── Invite Member ──

  router.post('/invite', requireJsonObject, adminOrOwner, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { email, role } = req.body;

      const errors: any[] = [];
      const emailErr = validateEmail(email, 'email');
      if (emailErr) errors.push(emailErr);
      const roleErr = validateRequiredEnum(role, 'role', VALID_TEAM_ROLES);
      if (roleErr) errors.push(roleErr);
      if (errors.length > 0) return validationError(res, errors);

      // Invite by email — the invitee does NOT need an existing account. If they
      // already have one (or sign up later), they accept via the invite token.
      const existingUser = userRepo.findByEmail(email);

      const existingMember = existingUser ? teamRepo.findByTenantAndUser(tenantId, existingUser.id) : undefined;
      if (existingMember) return res.status(409).json({ error: 'User is already a team member' });

      const existingInvite = invitationRepo.listByTenant(tenantId, 'pending')
        .find(i => i.email === email);
      if (existingInvite) return res.status(409).json({ error: 'Invitation already pending for this user' });

      const token = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      const invitation = invitationRepo.create(
        tenantId, email, role as TeamRole,
        req.user!.sub, req.user!.name,
        token, expiresAt,
      );

      activityRepo.record(
        tenantId, req.user!.sub, req.user!.name,
        'invite_member', 'invitation', invitation.id,
        { email, role },
      );

      res.status(201).json(invitation);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Invite member failed');
      res.status(500).json({ error: 'Failed to invite member' });
    }
  });

  // ── List Invitations ──

  router.get('/invitations', adminOrOwner, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const status = req.query.status as string | undefined;
      const invitations = invitationRepo.listByTenant(tenantId, status);
      res.json(invitations);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'List invitations failed');
      res.status(500).json({ error: 'Failed to list invitations' });
    }
  });

  // ── Cancel Invitation ──

  router.delete('/invitations/:id', ownerOnly, (req: Request, res: Response) => {
    try {
      const err = validateUUID(req.params.id, 'id');
      if (err) return res.status(400).json({ error: err.message, field: err.field });

      const tenantId = req.tenantId!;
      const cancelled = invitationRepo.cancel(req.params.id, tenantId);
      if (!cancelled) return res.status(404).json({ error: 'Invitation not found' });

      activityRepo.record(
        tenantId, req.user!.sub, req.user!.name,
        'cancel_invitation', 'invitation', req.params.id,
      );

      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Cancel invitation failed');
      res.status(500).json({ error: 'Failed to cancel invitation' });
    }
  });

  // ── Accept Invitation (public) ──

  router.get('/invitations/accept/:token', (req: Request, res: Response) => {
    try {
      const invitation = invitationRepo.findByToken(req.params.token);
      if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
      if (invitation.status !== 'pending') return res.status(400).json({ error: 'Invitation is no longer valid' });
      if (new Date(invitation.expiresAt) < new Date()) return res.status(400).json({ error: 'Invitation has expired' });

      const user = userRepo.findByEmail(invitation.email);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const member = teamRepo.add(
        invitation.tenantId, user.id, user.email, user.name,
        invitation.role, invitation.invitedBy,
      );

      invitationRepo.accept(invitation.id);

      activityRepo.record(
        invitation.tenantId, user.id, user.name,
        'accept_invitation', 'team_member', member.id,
        { invitationId: invitation.id },
      );

      res.json({ success: true, member });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Accept invitation failed');
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  // ── Remove Member ──

  router.delete('/members/:id', ownerOnly, (req: Request, res: Response) => {
    try {
      const err = validateUUID(req.params.id, 'id');
      if (err) return res.status(400).json({ error: err.message, field: err.field });

      const tenantId = req.tenantId!;
      const member = teamRepo.findById(req.params.id);
      if (!member || member.tenantId !== tenantId) return res.status(404).json({ error: 'Member not found' });

      if (member.userId === req.user!.sub) {
        return res.status(400).json({ error: 'Cannot remove yourself. Transfer ownership first.' });
      }

      teamRepo.remove(req.params.id, tenantId);

      activityRepo.record(
        tenantId, req.user!.sub, req.user!.name,
        'remove_member', 'team_member', req.params.id,
        { removedUserId: member.userId, removedEmail: member.email },
      );

      res.json({ success: true });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Remove member failed');
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  // ── Update Member Role ──

  router.put('/members/:id/role', requireJsonObject, ownerOnly, (req: Request, res: Response) => {
    try {
      const err = validateUUID(req.params.id, 'id');
      if (err) return res.status(400).json({ error: err.message, field: err.field });

      const tenantId = req.tenantId!;
      const { role } = req.body;

      const roleErr = validateRequiredEnum(role, 'role', VALID_TEAM_ROLES);
      if (roleErr) return validationError(res, [roleErr]);

      const member = teamRepo.findById(req.params.id);
      if (!member || member.tenantId !== tenantId) return res.status(404).json({ error: 'Member not found' });

      if (member.userId === req.user!.sub && member.role === 'owner') {
        return res.status(400).json({ error: 'Cannot demote yourself from owner. Transfer ownership first.' });
      }

      const updated = teamRepo.updateRole(req.params.id, role as TeamRole);

      activityRepo.record(
        tenantId, req.user!.sub, req.user!.name,
        'update_member_role', 'team_member', req.params.id,
        { fromRole: member.role, toRole: role },
      );

      res.json(updated);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Update role failed');
      res.status(500).json({ error: 'Failed to update member role' });
    }
  });

  // ── Transfer Ownership ──

  router.post('/transfer', requireJsonObject, ownerOnly, (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { userId } = req.body;

      const targetMember = teamRepo.findByTenantAndUser(tenantId, userId);
      if (!targetMember) return res.status(404).json({ error: 'Target user is not a member of this tenant' });

      const tenant = tenantRepo.findById(tenantId);

      const updated = teamRepo.transferOwnership(tenantId, userId, targetMember.email, targetMember.name);

      activityRepo.record(
        tenantId, req.user!.sub, req.user!.name,
        'transfer_ownership', 'tenant', tenantId,
        { previousOwnerId: req.user!.sub, newOwnerId: userId },
      );

      res.json({ success: true, member: updated });
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Transfer ownership failed');
      res.status(500).json({ error: 'Failed to transfer ownership' });
    }
  });

  // ── Activity History ──

  router.get('/activity', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const result = activityRepo.listByTenant(tenantId, page, limit);
      res.json(result);
    } catch (err: any) {
      createContextLogger(logger).error({ err }, 'Activity history failed');
      res.status(500).json({ error: 'Failed to fetch activity history' });
    }
  });

  return router;
}
