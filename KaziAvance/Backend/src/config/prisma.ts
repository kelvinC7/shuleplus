import "./env";
import { PrismaClient } from "../generated/prisma";

export const prisma = new PrismaClient();
