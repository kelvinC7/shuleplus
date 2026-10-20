import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const ORG_ID = 'org-dev-chat';
const ORG_CODE = 'DEVCHAT';
const ORG_NAME = 'Chat Dev Organization';

const MEMBERS = [
  { userId: 'u-admin', email: 'admin@chat.dev', firstName: 'Ada', lastName: 'Admin', department: 'IT', position: 'System Admin' },
  { userId: 'u-alice', email: 'alice@chat.dev', firstName: 'Alice', lastName: 'Mukamwezi', department: 'Finance', position: 'Accountant' },
  { userId: 'u-bob', email: 'bob@chat.dev', firstName: 'Bob', lastName: 'Habimana', department: 'IT', position: 'Developer' },
  { userId: 'u-carol', email: 'carol@chat.dev', firstName: 'Carol', lastName: 'Uwase', department: 'HR', position: 'HR Officer' },
  { userId: 'u-parent-1', email: 'parent1@chat.dev', firstName: 'Danielle', lastName: 'Uwimana', department: 'Parents', position: 'Parent' },
  { userId: 'u-parent-2', email: 'parent2@chat.dev', firstName: 'Eric', lastName: 'Niyonzima', department: 'Parents', position: 'Parent' },
];

async function main(): Promise<void> {
  await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: { organizationCode: ORG_CODE, organizationName: ORG_NAME },
    create: { organizationId: ORG_ID, organizationCode: ORG_CODE, organizationName: ORG_NAME },
  });

  for (const m of MEMBERS) {
    await prisma.chatMember.upsert({
      where: { organizationId_userId: { organizationId: ORG_ID, userId: m.userId } },
      update: { email: m.email, department: m.department, position: m.position },
      create: {
        organizationId: ORG_ID,
        userId: m.userId,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        department: m.department,
        position: m.position,
        kind: m.userId.startsWith('u-parent-') ? 'PARENT' : 'STAFF',
      },
    });
  }

  const announcement = await prisma.conversation.create({
    data: {
      organizationId: ORG_ID,
      type: 'ANNOUNCEMENT',
      name: 'Announcements',
      createdById: 'u-admin',
    },
  });
  const itDept = await prisma.conversation.create({
    data: {
      organizationId: ORG_ID,
      type: 'DEPARTMENT',
      name: 'IT',
      department: 'IT',
      createdById: 'u-bob',
    },
  });
  const group = await prisma.conversation.create({
    data: {
      organizationId: ORG_ID,
      type: 'GROUP',
      name: 'Finance & HR Sync',
      description: 'Cross-department coordination',
      createdById: 'u-alice',
    },
  });
  const direct = await prisma.conversation.create({
    data: { organizationId: ORG_ID, type: 'DIRECT', createdById: 'u-alice' },
  });

  const convMember = (conversationId: string, userId: string, role: 'ADMIN' | 'MEMBER') =>
    prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: {
        conversationId,
        organizationId: ORG_ID,
        userId,
        role,
        lastReadAt: new Date(),
      },
    });

  const staff = MEMBERS.filter((m) => !m.userId.startsWith('u-parent-'));

  for (const m of staff) await convMember(announcement.id, m.userId, m.userId === 'u-admin' ? 'ADMIN' : 'MEMBER');
  for (const m of staff.filter((x) => x.department === 'IT')) await convMember(itDept.id, m.userId, m.userId === 'u-bob' ? 'ADMIN' : 'MEMBER');
  for (const m of staff.filter((x) => x.department !== 'IT')) await convMember(group.id, m.userId, m.userId === 'u-alice' ? 'ADMIN' : 'MEMBER');
  await convMember(direct.id, 'u-alice', 'MEMBER');
  await convMember(direct.id, 'u-bob', 'MEMBER');

  const parentDm = await prisma.conversation.create({
    data: { organizationId: ORG_ID, type: 'DIRECT', createdById: 'u-alice' },
  });
  await convMember(parentDm.id, 'u-alice', 'MEMBER');
  await convMember(parentDm.id, 'u-parent-1', 'MEMBER');

  const messages = [
    { conversationId: announcement.id, senderId: 'u-admin', body: 'Welcome to the new Internal Chat!' },
    { conversationId: itDept.id, senderId: 'u-bob', body: 'Deploy window tonight at 22:00 UTC.' },
    { conversationId: group.id, senderId: 'u-alice', body: 'Budget review moved to Thursday.' },
    { conversationId: direct.id, senderId: 'u-alice', body: 'Hey Bob, can you review the PR?' },
    { conversationId: parentDm.id, senderId: 'u-parent-1', body: 'Hello, could I get an update on my child progress?' },
  ];
  for (const msg of messages) {
    await prisma.message.create({
      data: {
        conversationId: msg.conversationId,
        organizationId: ORG_ID,
        senderId: msg.senderId,
        type: 'TEXT',
        body: msg.body,
      },
    });
  }

  console.log(`Seeded tenant ${ORG_ID} with ${MEMBERS.length} members, 5 conversations, ${messages.length} messages.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
