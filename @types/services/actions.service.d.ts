export interface IActionContext {
    conversationId: string;
    userId: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'info';
    status?: string;
    reply?: string;
    messageContent?: string;
  }
  
export interface IActionResult {
    success: boolean;
    data?: any;
    error?: any;
    message?: string;
  }