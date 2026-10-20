import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, tryResolveActiveStudent } from './parent-context.service';
import { storeApi, StoreResponse } from './store-api';
import type { StudentSelector } from '../utils/student-param';

export class StoreService {
  async list(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);

    try {
      if (student) {
        const remote = await storeApi.getStore(organizationId, student.shuleCode);
        return this.mapRemote(remote);
      }
    } catch (error) {
      console.warn(
        `[store] ShuleKit MIS module unreachable (${(error as Error).message}); falling back to local data`
      );
    }
    return this.fallbackList(organizationId, parentId);
  }

  async createOrder(
    organizationId: string,
    parentId: string,
    input: { items: Array<{ productId: string; quantity: number }> },
    requestedStudentId?: StudentSelector
  ) {
    if (!input.items?.length) throw new AppError(400, 'Order must contain at least one item');

    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });

    try {
      const remote = await storeApi.createOrder(organizationId, student.shuleCode, {
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        parentName: parent ? `${parent.firstName} ${parent.lastName}` : '',
        items: input.items,
      });

      try {
        await prisma.activityLog.create({
          data: {
            organizationId,
            userId: parentId,
            action: 'STORE_ORDER',
            description: `Store order #${remote.id.slice(0, 8)} placed (${remote.total.toLocaleString()} RWF)`,
          },
        });
      } catch (logError) {
        console.warn('[store] failed to write activity log', logError);
      }

      return {
        id: remote.id,
        date: new Date().toISOString(),
        total: remote.total,
        status: remote.status,
        items: input.items.map((i) => ({
          id: null,
          name: i.productId,
          quantity: i.quantity,
          price: 0,
        })),
      };
    } catch (error) {
      console.warn(
        `[store] ShuleKit MIS order creation failed (${(error as Error).message}); falling back to local data`
      );
      return this.fallbackCreate(organizationId, parentId, input, student.id);
    }
  }

  private mapRemote(data: StoreResponse) {
    return {
      products: data.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        imageUrl: p.imageUrl,
      })),
      orders: data.orders.map((o) => ({
        id: o.id,
        date: o.date,
        total: o.total,
        status: o.status,
        items: o.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      })),
    };
  }

  private async fallbackList(organizationId: string, parentId: string) {
    const [products, orders] = await Promise.all([
      prisma.storeProduct.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
      prisma.storeOrder.findMany({
        where: { parentId },
        orderBy: { date: 'desc' },
        take: 20,
        include: { items: { include: { product: true } } },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        imageUrl: p.imageUrl,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        date: o.date.toISOString(),
        total: o.total,
        status: o.status,
        items: o.items.map((i) => ({
          id: i.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.price,
        })),
      })),
    };
  }

  private async fallbackCreate(
    organizationId: string,
    parentId: string,
    input: { items: Array<{ productId: string; quantity: number }> },
    studentId: string
  ) {
    if (!input.items?.length) throw new AppError(400, 'Order must contain at least one item');

    const products = await prisma.storeProduct.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, organizationId },
    });
    if (products.length !== input.items.length) {
      throw new AppError(400, 'One or more products are not available');
    }

    let total = 0;
    const items = input.items.map((i) => {
      const product = products.find((p) => p.id === i.productId)!;
      if (i.quantity <= 0) throw new AppError(400, 'Quantity must be positive');
      if (product.stock < i.quantity) throw new AppError(400, `Insufficient stock for ${product.name}`);
      total += product.price * i.quantity;
      return { productId: product.id, quantity: i.quantity, price: product.price };
    });

    const order = await prisma.storeOrder.create({
      data: {
        organizationId,
        parentId,
        studentId,
        date: new Date(),
        total,
        status: 'PAID',
        items: { create: items },
      },
      include: { items: { include: { product: true } } },
    });

    await prisma.$transaction(
      items.map((i) =>
        prisma.storeProduct.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } },
        })
      )
    );

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: parentId,
        action: 'STORE_ORDER',
        description: `Store order #${order.id.slice(0, 8)} placed (${total.toLocaleString()} RWF)`,
      },
    });

    return {
      id: order.id,
      date: order.date.toISOString(),
      total: order.total,
      status: order.status,
      items: order.items.map((i) => ({
        id: i.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.price,
      })),
    };
  }
}

export const storeService = new StoreService();
