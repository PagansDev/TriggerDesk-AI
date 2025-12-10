import { Request } from 'express';

export interface IJWTPayload {
    userId: string;
    username: string;
    email: string;
    role: string;
    type: string;
    iat: number;
    exp: number;
  }
  
  export interface IAuthenticatedRequest extends Request {
    userId?: string;
    username?: string;
    userEmail?: string;
    userRole?: string;
  }