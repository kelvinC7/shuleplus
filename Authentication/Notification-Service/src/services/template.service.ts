import { NotificationChannel } from '@prisma/client';
import { prisma } from '../config/database';

function render(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
    template
  );
}

export const templateService = {
  async list(channel?: NotificationChannel) {
    return prisma.notificationTemplate.findMany({
      where: { isActive: true, ...(channel ? { channel } : {}) },
      orderBy: { name: 'asc' },
    });
  },

  async getBySlug(slug: string) {
    return prisma.notificationTemplate.findUnique({ where: { slug } });
  },

  async renderTemplate(slug: string, variables: Record<string, string>) {
    const tpl = await this.getBySlug(slug);
    if (!tpl || !tpl.isActive) return null;
    return {
      channel: tpl.channel,
      subject: tpl.subject ? render(tpl.subject, variables) : undefined,
      html: tpl.bodyHtml ? render(tpl.bodyHtml, variables) : undefined,
      text: tpl.bodyText ? render(tpl.bodyText, variables) : undefined,
    };
  },

  async upsert(data: {
    slug: string;
    name: string;
    channel: NotificationChannel;
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    variables?: string[];
  }) {
    return prisma.notificationTemplate.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        name: data.name,
        channel: data.channel,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        variables: data.variables,
      },
      update: {
        name: data.name,
        channel: data.channel,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        variables: data.variables,
      },
    });
  },
};
