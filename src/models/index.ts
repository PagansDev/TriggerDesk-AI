import connectDatabase from '../config/database.js';
import User from './User.js';
import Conversation from './Conversation.js';
import Message from './Message.js';
import Ticket from './Ticket.js';
import ChatNotification from './ChatNotification.js';

const models = {
  User,
  Conversation,
  Message,
  Ticket,
  ChatNotification,
};

export { connectDatabase };
export default models;
