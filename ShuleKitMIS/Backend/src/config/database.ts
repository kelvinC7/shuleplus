import './env'; // must load DATABASE_URL before PrismaClient
import { PrismaClient } from '../generated/prisma';

export const prisma = new PrismaClient();
