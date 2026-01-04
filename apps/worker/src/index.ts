import { prisma } from '@customer-service/db';
import { kbEmbed } from './jobs/kbEmbed';
import { ticketSummary } from './jobs/ticketSummary';
import { notifyScheduled } from './jobs/notifyScheduled';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

interface Job {
  type: string;
  payload: Record<string, unknown>;
  id?: string;
}

// Simple in-memory queue (MVP - can be replaced with Redis/BullMQ)
const jobQueue: Job[] = [];

// Process jobs
async function processJobs() {
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;

    try {
      logger.info({ jobType: job.type, jobId: job.id }, 'Processing job');

      switch (job.type) {
        case 'kb:embed':
          await kbEmbed(job.payload.articleId as string);
          break;
        case 'ticket:summary':
          await ticketSummary(job.payload.ticketId as string);
          break;
        case 'notify:scheduled':
          await notifyScheduled(job.payload.notificationId as string);
          break;
        default:
          logger.warn({ jobType: job.type }, 'Unknown job type');
      }

      logger.info({ jobType: job.type, jobId: job.id }, 'Job completed');
    } catch (error) {
      logger.error({ jobType: job.type, jobId: job.id, error }, 'Job failed');
      // Retry logic could be added here
    }
  }
}

// Scheduler: Check for pending jobs every minute
async function scheduler() {
  logger.info('Starting scheduler');

  // Check for articles without embeddings
  const articlesWithoutEmbeddings = await prisma.knowledgeArticle.findMany({
    where: {
      // In production, check for null embeddingVector
      // For MVP, we'll process all articles periodically
    },
    take: 10
  });

  for (const article of articlesWithoutEmbeddings) {
    jobQueue.push({
      type: 'kb:embed',
      payload: { articleId: article.id },
      id: `embed_${article.id}`
    });
  }

  // Check for tickets without summaries
  const ticketsWithoutSummaries = await prisma.ticket.findMany({
    where: {
      summary: null,
      status: { in: ['IN_PROGRESS', 'WAITING_CUSTOMER'] }
    },
    take: 10
  });

  for (const ticket of ticketsWithoutSummaries) {
    jobQueue.push({
      type: 'ticket:summary',
      payload: { ticketId: ticket.id },
      id: `summary_${ticket.id}`
    });
  }

  // Check for scheduled notifications (stub)
  // In production, query a notifications table
  // For MVP, this is a stub

  // Process queued jobs
  await processJobs();
}

// Start scheduler
const SCHEDULER_INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL || '60000', 10); // 1 minute default

setInterval(async () => {
  try {
    await scheduler();
  } catch (error) {
    logger.error({ error }, 'Scheduler error');
  }
}, SCHEDULER_INTERVAL);

// Also run immediately
scheduler().catch(error => {
  logger.error({ error }, 'Initial scheduler run failed');
});

logger.info(`🚀 Worker started (scheduler interval: ${SCHEDULER_INTERVAL}ms)`);

// Keep process alive
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
