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

    // Update request.user with verified user data
    (request as any).user = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    };
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}
