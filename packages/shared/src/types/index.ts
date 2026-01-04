export type TenantId = string;
export type UserId = string;
export type CustomerId = string;
export type ConversationId = string;
export type MessageId = string;
export type TicketId = string;
export type KnowledgeArticleId = string;
export type ShipmentId = string;
export type CallSessionId = string;

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TicketCategory {
  RECLAMO = 'RECLAMO',
  INFO = 'INFO',
  FACTURACION = 'FACTURACION',
  TRACKING = 'TRACKING',
  COTIZACION = 'COTIZACION',
  OTRO = 'OTRO'
}

export enum Channel {
  WHATSAPP = 'WHATSAPP',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT'
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

export enum IntentType {
  RECLAMO = 'reclamo',
  INFO = 'info',
  FACTURACION = 'facturacion',
  TRACKING = 'tracking',
  COTIZACION = 'cotizacion',
  OTRO = 'otro'
}

export enum AIMode {
  ASSISTED = 'ASSISTED',
  AUTOPILOT = 'AUTOPILOT'
}

export interface TriageResult {
  intent: IntentType;
  confidence: number;
  missingFields: string[];
  suggestedActions: SuggestedAction[];
  suggestedReply: string;
  autopilotEligible: boolean;
}

export interface SuggestedAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface TrackingStatus {
  trackingNumber: string;
  carrier?: string;
  status: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  description: string;
  occurredAt: Date;
  location?: string;
}
