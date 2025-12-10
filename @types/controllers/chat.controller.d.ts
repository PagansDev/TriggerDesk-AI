import { Socket } from 'socket.io';
import { Types } from 'mongoose';


export interface ISupportContext {
    // defina aqui a estrutura de dados do contexto de suporte
    // lembrando que o contexto de suporte é passado no handshake do socket pelo frontend
    // o contexto pode ser o resultado de uma interceptação de dados feito pelo frontend ao backend, como: históricos, configurações, dados do usuário, etc.
    // Cabe a você definir o que é importante e construir os interceptadores que irão gerar o contexto de suporte
  }
  
  export interface IAuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
    userEmail?: string;
    userRole?: string;
    livechatUserId?: Types.ObjectId;
    conversationId?: string;
    supportContext?: ISupportContext;
  }