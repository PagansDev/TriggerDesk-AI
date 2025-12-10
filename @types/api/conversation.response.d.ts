export interface UserWithExternalId {
  _id: string;
  username: string;
  email?: string;
  externalUserId: string;
}

export interface PopulatedUser {
  _id: string;
  username: string;
  email?: string;
  externalUserId: string;
  isOnline?: boolean;
  isBanned?: boolean;
}

export interface TicketWithPopulatedAssignedTo {
  _id: string;
  priority: string;
  status: string;
  subject: string | null;
  unreadCountSupport: number;
  assignedTo?: UserWithExternalId;
}

export interface ConversationResponse {
  _id: string;
  userId: PopulatedUser;
  externalUserId: string;
  ticketId?: TicketWithPopulatedAssignedTo;
  assignedTo?: UserWithExternalId;
  title: string;
  status: string;
  lastMessageAt: Date;
  hasInternalMessages: boolean;
  isInternal: boolean;
  needHumanAttention: boolean;
  spamCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    content: string;
    createdAt: Date;
    isFromAI: boolean;
    senderName: string;
  };
  unreadCount?: number;
}
