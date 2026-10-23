import { z } from 'zod';
import { idSchema } from '../../shared/validation.js';

export const directConversationSchema = z.strictObject({ userId: idSchema });
export const sendMessageSchema = z.strictObject({
  content: z.string().trim().min(1).max(10000),
  replyToId: idSchema.optional(),
});
export const updateMessageSchema = z.strictObject({ content: z.string().trim().min(1).max(10000) });
export const conversationParamsSchema = z.object({ id: idSchema });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
