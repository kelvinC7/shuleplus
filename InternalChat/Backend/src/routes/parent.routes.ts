import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest, requireParent } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { ensureMember } from '../middleware/self.middleware';
import { conversationService } from '../services/conversation.service';
import { messageService } from '../services/message.service';
import { memberService } from '../services/member.service';
import { uploadService } from '../services/upload.service';
import { chatEvents } from '../socket';
import { prisma } from '../config/database';
import { presence } from '../socket/presence';

export const parentRouter = Router();

const startConversationSchema = z.object({
  staffId: z.string().min(1),
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

const uploadSchema = z.object({
  dataUri: z.string().min(1),
  name: z.string().max(255).optional(),
});

function orgId(req: AuthenticatedRequest): string {
  return req.organizationRef ?? req.user!.organizationId;
}

parentRouter.use(authenticate, requireTenant, ensureMember, requireParent);

parentRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  const organizationId = orgId(req);
  const me = await prisma.chatMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: req.user!.sub } },
  });
  res.json({ success: true, data: { ...me, online: presence.isOnline(req.user!.sub) } });
});

parentRouter.get('/directory', async (req: AuthenticatedRequest, res) => {
  const search = req.query.search as string | undefined;
  const organizationId = orgId(req);
  const staff = await memberService.listStaff(organizationId, search);
  const online = new Set(presence.onlineUserIds(organizationId));
  res.json({ success: true, data: staff.map((m) => ({ ...m, online: online.has(m.userId) })) });
});

parentRouter.get('/conversations', async (req: AuthenticatedRequest, res) => {
  const data = await conversationService.list(req.user!.sub, orgId(req));
  res.json({ success: true, data });
});

parentRouter.post('/conversations', async (req: AuthenticatedRequest, res) => {
  const { staffId } = startConversationSchema.parse(req.body);
  const conversation = await conversationService.create({
    type: 'DIRECT',
    memberIds: [staffId],
    createdById: req.user!.sub,
    organizationId: orgId(req),
  });
  res.status(201).json({ success: true, data: conversation });
});

parentRouter.get('/conversations/:id', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const data = await conversationService.getById(id, req.user!.sub, orgId(req));
  res.json({ success: true, data });
});

parentRouter.get('/conversations/:id/messages', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const data = await messageService.list(id, req.user!.sub, orgId(req), {
    before: typeof req.query.before === 'string' ? req.query.before : undefined,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
  });
  res.json({ success: true, data });
});

parentRouter.post('/conversations/:id/messages', async (req: AuthenticatedRequest, res) => {
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
  res.status(201).json({ success: true, data: message });
});

parentRouter.post('/conversations/:id/messages/:messageId/read', async (req: AuthenticatedRequest, res) => {
  const id = z.string().min(1).parse(req.params.id);
  const messageId = z.string().min(1).parse(req.params.messageId);
  const read = await messageService.markRead(id, messageId, req.user!.sub, orgId(req));
  res.json({ success: true, data: read });
});

parentRouter.post('/conversations/:id/typing', async (req: AuthenticatedRequest, res) => {
  const conversationId = z.string().min(1).parse(req.params.id);
  const { isTyping } = z.object({ isTyping: z.boolean().default(true) }).parse(req.body);
  chatEvents.emitTyping(orgId(req), conversationId, {
    conversationId,
    userId: req.user!.sub,
    isTyping,
  });
  res.json({ success: true, data: { conversationId, isTyping } });
});

parentRouter.post('/uploads', async (req: AuthenticatedRequest, res) => {
  const { dataUri, name } = uploadSchema.parse(req.body);
  const data = await uploadService.save(dataUri, name);
  res.status(201).json({ success: true, data });
});
