import { prisma } from '@customer-service/db';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

export async function notifyScheduled(notificationId: string): Promise<void> {
  logger.info({ notificationId }, 'Processing scheduled notification job');

  // MVP: Stub implementation
  // In production, this would:
  // 1. Fetch notification details
  // 2. Check if it's time to send
  // 3. Send via appropriate channel (WhatsApp, email, etc.)
  // 4. Mark as sent

  logger.info({ notificationId }, 'Scheduled notification processed (stub mode - no actual send)');
  
  // For now, just log
  // await prisma.notification.update({
  //   where: { id: notificationId },
  //   data: { status: 'sent', sentAt: new Date() }
  // });
}
