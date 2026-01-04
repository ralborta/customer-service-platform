import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@customer-service/db';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { userId: string; tenantId: string; email: string; role: string } | AuthUser;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true }
    });

    if (!user || !user.active) {
      return reply.code(401).send({ error: 'User not found or inactive' });
    }

    request.authUser = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    };
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
