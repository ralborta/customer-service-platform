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

export async function ticketSummary(ticketId: string): Promise<void> {
  logger.info({ ticketId }, 'Processing ticket summary job');

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          },
          customer: true
        }
      },
      events: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // Generate summary from conversation messages
  const messages = ticket.conversation?.messages || [];
  const messageTexts = messages.map(m => m.text).filter(Boolean).join('\n');

  let summary = '';

  // MVP: Simple summary (can be enhanced with LLM)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== '') {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Genera un resumen conciso del ticket de atención al cliente en máximo 3 oraciones.'
            },
            {
              role: 'user',
              content: `Conversación:\n${messageTexts}\n\nCategoría: ${ticket.category}\nPrioridad: ${ticket.priority}`
            }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });

      if (response.ok) {
        const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        summary = data.choices?.[0]?.message?.content || '';
      }
    } catch (error) {
      logger.error({ ticketId, error }, 'Failed to generate summary with LLM');
    }
  }

  // Fallback: Simple rule-based summary
  if (!summary) {
    const firstMessage = messages[0]?.text || '';
    const category = ticket.category;
    summary = `Ticket de ${category}. ${firstMessage.substring(0, 200)}${firstMessage.length > 200 ? '...' : ''}`;
  }

  // Update ticket
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { summary }
  });

  // Create event
  await prisma.ticketEvent.create({
    data: {
      ticketId,
      type: 'summary_generated',
      data: { summary, generatedAt: new Date() }
    }
  });

  logger.info({ ticketId, summaryLength: summary.length }, 'Ticket summary generated');
}
