import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@customer-service/db';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

// No need to declare user decorator - @fastify/jwt already provides it
// We'll use request.user from JWT and cast it to AuthUser

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const payload = request.user as { userId: string; tenantId: string; email: string; role: string };
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true }
    });

    if (!user || !user.active) {
      return reply.code(401).send({ error: 'User not found or inactive' });
    }

    // request.user is already set by jwtVerify, we just need to verify it matches our user
    // No need to reassign, just use the payload from JWT
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
