import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { ensureMember } from '../middleware/self.middleware';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';
import { chatEvents } from '../socket';

export const conversationRouter = Router();

const createConversationSchema = z.object({
  type: z.enum(['DIRECT', 'GROUP', 'DEPARTMENT', 'ANNOUNCEMENT']),
  name: z.string().trim().min(1).max(120).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  memberIds: z.array(z.string().min(1)).max(200).optional(),
});

const createMessageSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
  body: z.string().trim().max(10000).optional(),
  attachment: z
    .object({
      url: z.string().min(1),
      name: z.string().max(255).optional(),
      mime: z.string().min(1),
      size: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

function orgId(req: AuthenticatedRequest): string {
  return req.organizationRef ?? req.user!.organizationId;
}

conversationRouter.use(authenticate, requireTenant, ensureMember);

conversationRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const data = await conversationService.list(req.user!.sub, orgId(req));
  res.json({ success: true, data });
});

conversationRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const input = createConversationSchema.parse(req.body);
  const conversation = await conversationService.create({
    organizationId: orgId(req),
    createdById: req.user!.sub,
    type: input.type,
    name: input.name,
    department: input.department,
    description: input.description,
    memberIds: input.memberIds,
  });
  const memberIds =
    input.type === 'DIRECT' ? [req.user!.sub, ...(input.memberIds ?? [])] : [];
  const full = await conversationService.getById(conversation.id, req.user!.sub, orgId(req));
  chatEvents.emitConversationCreated(orgId(req), full, memberIds);
  res.status(201).json({ success: true, data: full });
});

conversationRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const data = await conversationService.getById(id, req.user!.sub, orgId(req));
  res.json({ success: true, data });
});

conversationRouter.get('/:id/messages', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const before = req.query.before as string | undefined;
  const limit = req.query.limit as string | undefined;
  const data = await messageService.list(id, req.user!.sub, orgId(req), {
    before,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json({ success: true, data });
});

conversationRouter.post('/:id/messages', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const input = createMessageSchema.parse(req.body);
  const message = await messageService.create({
    conversationId: id,
    organizationId: orgId(req),
    senderId: req.user!.sub,
    type: input.type,
    body: input.body,
    attachment: input.attachment,
  });
  chatEvents.emitNewMessage(orgId(req), message);
  res.status(201).json({ success: true, data: message });
});

conversationRouter.post('/:id/messages/:messageId/read', async (req: AuthenticatedRequest, res) => {
  const conversationId = z.string().min(1).parse(req.params.id);
  const messageId = z.string().min(1).parse(req.params.messageId);
  const read = await messageService.markRead(
    conversationId,
    messageId,
    req.user!.sub,
    orgId(req)
  );
  chatEvents.emitRead(orgId(req), read);
  res.json({ success: true, data: read });
});

conversationRouter.post('/:id/typing', async (req: AuthenticatedRequest, res) => {
  const conversationId = z.string().min(1).parse(req.params.id);
  const { isTyping } = z.object({ isTyping: z.boolean().default(true) }).parse(req.body);
  chatEvents.emitTyping(orgId(req), conversationId, {
    conversationId,
    userId: req.user!.sub,
    isTyping,
  });
  res.json({ success: true, data: { conversationId, isTyping } });
});

conversationRouter.post('/:id/members', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const { userId } = z.object({ userId: z.string().min(1) }).parse(req.body);
  const data = await conversationService.addMember(id, userId, req.user!.sub, orgId(req));
  chatEvents.emitConversationMemberChanged(orgId(req), id, 'member_added', {
    conversationId: id,
    userId,
  });
  res.status(201).json({ success: true, data });
});

conversationRouter.delete('/:id/members/:userId', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const userId = z.string().min(1).parse(req.params.userId);
  const data = await conversationService.removeMember(id, userId, req.user!.sub, orgId(req));
  chatEvents.emitConversationMemberChanged(orgId(req), id, 'member_removed', {
    conversationId: id,
    userId,
  });
  res.json({ success: true, data });
});

conversationRouter.post('/:id/leave', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const data = await conversationService.leave(id, req.user!.sub, orgId(req));
  chatEvents.emitConversationMemberChanged(orgId(req), id, 'left', {
    conversationId: id,
    userId: req.user!.sub,
  });
  res.json({ success: true, data });
});
