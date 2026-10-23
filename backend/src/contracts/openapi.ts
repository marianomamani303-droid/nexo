import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../modules/auth/auth.validation.js';
import {
  resetPasswordSchema,
  resetRequestSchema,
  verifyTokenSchema,
} from '../modules/auth/account-tokens.validation.js';
import { updateProfileSchema } from '../modules/users/users.validation.js';
import {
  createPostSchema,
  updatePostSchema,
  reactionBodySchema,
} from '../modules/posts/posts.validation.js';
import {
  createCommentSchema,
  updateCommentSchema,
} from '../modules/comments/comments.validation.js';
import {
  createCommunitySchema,
  updateCommunitySchema,
  memberRoleSchema,
} from '../modules/communities/communities.validation.js';
import {
  directConversationSchema,
  sendMessageSchema,
  updateMessageSchema,
} from '../modules/messages/messages.validation.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../modules/projects/projects.validation.js';

type Schema = Record<string, unknown>;
const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const string = { type: 'string' };
const uuid = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date-time' };
const nullableString = { type: 'string', nullable: true };
const nullableDate = { ...date, nullable: true };
const count = { type: 'integer', minimum: 0 };
const boolean = { type: 'boolean' };
function object(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: 'object', properties, required };
}
function page(name: string) {
  return object({ items: { type: 'array', items: reference(name) }, nextCursor: nullableString });
}
function input(schema: z.ZodType) {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' });
}

function authInput(schema: z.ZodType) {
  const converted = input(schema);
  return {
    ...converted,
    properties: {
      ...converted.properties,
      email: {
        type: 'string',
        format: 'email',
        maxLength: 254,
        description: 'Se eliminan espacios externos y se convierte a minúsculas.',
      },
    },
  };
}

function patchInput(schema: z.ZodType) {
  return { ...input(schema), minProperties: 1 };
}

const schemas: Record<string, Schema> = {
  Error: object(
    {
      code: string,
      message: string,
      requestId: uuid,
      details: { type: 'array', items: object({ field: string, message: string }) },
    },
    ['code', 'message', 'requestId'],
  ),
  SessionUser: object({
    id: uuid,
    email: { type: 'string', format: 'email' },
    name: string,
    handle: string,
  }),
  Session: object({ user: reference('SessionUser') }),
  AcceptedMessage: object({ message: string }),
  Author: object({ id: uuid, name: string, handle: string }),
  User: object({
    id: uuid,
    name: string,
    handle: string,
    bio: nullableString,
    location: nullableString,
    website: nullableString,
    createdAt: date,
    followersCount: count,
    followingCount: count,
    followed: boolean,
  }),
  MyProfile: { allOf: [reference('User'), object({ email: { type: 'string', format: 'email' } })] },
  Post: object({
    id: uuid,
    authorId: uuid,
    author: reference('Author'),
    communityId: { ...uuid, nullable: true },
    content: { type: 'string', nullable: true },
    category: nullableString,
    visibility: { type: 'string', enum: ['public', 'followers', 'community'] },
    createdAt: date,
    updatedAt: date,
    reactionsCount: count,
    commentsCount: count,
    viewerReaction: nullableString,
    bookmarked: boolean,
  }),
  Comment: object({
    id: uuid,
    postId: uuid,
    authorId: uuid,
    parentId: { ...uuid, nullable: true },
    content: string,
    createdAt: date,
    updatedAt: date,
  }),
  CommentListItem: {
    allOf: [
      reference('Comment'),
      object({
        author: reference('Author'),
        reactionsCount: count,
        viewerReaction: nullableString,
      }),
    ],
  },
  Community: object({
    id: uuid,
    ownerId: uuid,
    slug: string,
    name: string,
    description: string,
    category: nullableString,
    visibility: { type: 'string', enum: ['public', 'private'] },
    createdAt: date,
    updatedAt: date,
    membersCount: count,
    memberRole: { type: 'string', nullable: true, enum: ['owner', 'moderator', 'member', null] },
  }),
  CommunityMember: object({
    id: uuid,
    name: string,
    handle: string,
    role: { type: 'string', enum: ['owner', 'moderator', 'member'] },
    createdAt: date,
  }),
  Notification: object({
    id: uuid,
    kind: string,
    actorId: { ...uuid, nullable: true },
    actorName: nullableString,
    actorHandle: nullableString,
    postId: { ...uuid, nullable: true },
    commentId: { ...uuid, nullable: true },
    conversationId: { ...uuid, nullable: true },
    messageId: { ...uuid, nullable: true },
    createdAt: date,
    readAt: nullableDate,
  }),
  Conversation: object({
    id: uuid,
    kind: { type: 'string', enum: ['direct'] },
    title: nullableString,
    createdAt: date,
    updatedAt: date,
  }),
  ConversationListItem: {
    allOf: [
      reference('Conversation'),
      object({
        participantId: uuid,
        participantName: string,
        participantHandle: string,
        unreadCount: count,
        lastReadAt: nullableDate,
      }),
    ],
  },
  Message: object({
    id: uuid,
    conversationId: uuid,
    senderId: uuid,
    content: { type: 'string', nullable: true },
    replyToId: { ...uuid, nullable: true },
    createdAt: date,
    updatedAt: date,
  }),
  Project: object({
    id: uuid,
    authorId: uuid,
    title: string,
    description: string,
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    visibility: { type: 'string', enum: ['public', 'followers'] },
    createdAt: date,
    updatedAt: date,
  }),
  RegisterInput: authInput(registerSchema),
  LoginInput: authInput(loginSchema),
  ChangePasswordInput: input(changePasswordSchema),
  ResetRequestInput: authInput(resetRequestSchema),
  ResetPasswordInput: input(resetPasswordSchema),
  VerifyTokenInput: input(verifyTokenSchema),
  UpdateProfileInput: patchInput(updateProfileSchema),
  CreatePostInput: input(createPostSchema),
  UpdatePostInput: patchInput(updatePostSchema),
  ReactionInput: input(reactionBodySchema),
  CreateCommentInput: input(createCommentSchema),
  UpdateCommentInput: input(updateCommentSchema),
  CreateCommunityInput: input(createCommunitySchema),
  UpdateCommunityInput: patchInput(updateCommunitySchema),
  MemberRoleInput: input(memberRoleSchema),
  DirectConversationInput: input(directConversationSchema),
  SendMessageInput: input(sendMessageSchema),
  UpdateMessageInput: input(updateMessageSchema),
  CreateProjectInput: input(createProjectSchema),
  UpdateProjectInput: patchInput(updateProjectSchema),
};
for (const name of [
  'User',
  'Post',
  'CommentListItem',
  'Community',
  'CommunityMember',
  'Notification',
  'ConversationListItem',
  'Message',
  'Project',
])
  schemas[`${name}Page`] = page(name);

interface OperationOptions {
  body?: string;
  response?: string;
  status?: number;
  authenticated?: boolean;
  paginated?: boolean;
  filters?: string[];
  description?: string;
}
const paths: Record<string, Record<string, unknown>> = {};

function operation(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  summary: string,
  options: OperationOptions = {},
) {
  const parameters: Schema[] = [];
  for (const match of path.matchAll(/\{(\w+)\}/g))
    parameters.push({ name: match[1], in: 'path', required: true, schema: uuid });
  if (method !== 'get')
    parameters.push({
      name: 'X-Nexo-CSRF',
      in: 'header',
      required: true,
      schema: { type: 'string', enum: ['1'] },
    });
  if (options.paginated) {
    parameters.push({
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    });
    parameters.push({ name: 'cursor', in: 'query', schema: { type: 'string', maxLength: 600 } });
  }
  for (const name of options.filters || [])
    parameters.push({
      name,
      in: 'query',
      schema: name.endsWith('Id')
        ? uuid
        : name === 'unread'
          ? { type: 'string', enum: ['true', 'false'] }
          : { type: 'string', maxLength: name === 'category' ? 80 : 100 },
    });
  const status = options.status || (options.response ? 200 : 204);
  const responses: Record<string, unknown> = {
    [status]: {
      description: 'Operación exitosa.',
      ...(options.response
        ? { content: { 'application/json': { schema: reference(options.response) } } }
        : {}),
    },
  };
  for (const code of [400, 401, 403, 404, 409, 413, 429, 500, 503])
    responses[code] = {
      description: `Error HTTP ${code}.`,
      content: { 'application/json': { schema: reference('Error') } },
    };
  const definition = {
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    tags: [path.split('/')[1]],
    description: options.description,
    security: options.authenticated ? [{ cookieAuth: [] }] : [],
    parameters,
    responses,
    ...(options.body
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: reference(options.body) } },
          },
        }
      : {}),
  };
  paths[path] = { ...paths[path], [method]: definition };
}

operation('get', '/health', 'Estado del proceso', { response: 'Health' });
operation('get', '/health/ready', 'Disponibilidad de MySQL', { response: 'Readiness' });
schemas.Health = object({ status: { type: 'string', enum: ['ok'] } });
schemas.Readiness = object({ status: { type: 'string', enum: ['ready'] } });
operation('post', '/auth/register', 'Crear cuenta y sesión', {
  body: 'RegisterInput',
  response: 'Session',
  status: 201,
});
operation('post', '/auth/login', 'Iniciar sesión y rotar la presente', {
  body: 'LoginInput',
  response: 'Session',
});
operation('get', '/auth/session', 'Consultar sesión vigente', {
  response: 'Session',
  authenticated: true,
});
operation('post', '/auth/logout', 'Revocar sesión presente');
operation('post', '/auth/password', 'Cambiar contraseña y revocar todas las sesiones', {
  body: 'ChangePasswordInput',
  authenticated: true,
});
operation('post', '/auth/forgot-password', 'Solicitar recuperación de cuenta', {
  body: 'ResetRequestInput',
  response: 'AcceptedMessage',
  status: 202,
  description: 'La respuesta no revela si el correo está registrado.',
});
operation('post', '/auth/reset-password', 'Restablecer contraseña con un token de un solo uso', {
  body: 'ResetPasswordInput',
});
operation('post', '/auth/verification', 'Solicitar verificación del correo de la sesión', {
  response: 'AcceptedMessage',
  status: 202,
  authenticated: true,
});
operation('post', '/auth/verify-email', 'Verificar correo con un token de un solo uso', {
  body: 'VerifyTokenInput',
});
operation('get', '/users', 'Buscar usuarios', {
  response: 'UserPage',
  paginated: true,
  filters: ['q'],
});
operation('get', '/users/me', 'Perfil personal con correo', {
  response: 'MyProfile',
  authenticated: true,
});
operation('patch', '/users/me', 'Actualizar perfil personal', {
  body: 'UpdateProfileInput',
  response: 'User',
  authenticated: true,
});
operation('get', '/users/{id}', 'Consultar perfil público', { response: 'User' });
for (const relation of ['followers', 'following'])
  operation('get', `/users/{id}/${relation}`, `Listar ${relation}`, {
    response: 'UserPage',
    paginated: true,
  });
for (const method of ['put', 'delete'] as const)
  operation(method, '/users/{id}/follow', method === 'put' ? 'Seguir usuario' : 'Dejar de seguir', {
    authenticated: true,
  });
operation('get', '/posts', 'Buscar publicaciones visibles', {
  response: 'PostPage',
  paginated: true,
  filters: ['q', 'authorId', 'communityId', 'category'],
});
operation('get', '/posts/bookmarks', 'Publicaciones guardadas aún visibles', {
  response: 'PostPage',
  authenticated: true,
  paginated: true,
  filters: ['q', 'authorId', 'communityId', 'category'],
});
operation('get', '/feed', 'Feed de autores seguidos, publicaciones propias y comunidades', {
  response: 'PostPage',
  authenticated: true,
  paginated: true,
  filters: ['q', 'authorId', 'communityId', 'category'],
});
operation('post', '/posts', 'Crear publicación de texto', {
  body: 'CreatePostInput',
  response: 'Post',
  status: 201,
  authenticated: true,
  description:
    'Requiere membresía para comunidades. communityId exige visibility=community o sin visibility. Sin comunidad, solo public/followers.',
});
operation('get', '/posts/{id}', 'Consultar publicación visible', { response: 'Post' });
operation('patch', '/posts/{id}', 'Editar publicación propia', {
  body: 'UpdatePostInput',
  response: 'Post',
  authenticated: true,
});
operation('delete', '/posts/{id}', 'Eliminar publicación propia o moderar en comunidad', {
  authenticated: true,
});
operation('put', '/posts/{id}/reaction', 'Establecer reacción idempotente', {
  body: 'ReactionInput',
  authenticated: true,
});
operation('delete', '/posts/{id}/reaction', 'Retirar reacción', { authenticated: true });
for (const method of ['put', 'delete'] as const)
  operation(
    method,
    '/posts/{id}/bookmark',
    method === 'put' ? 'Guardar publicación' : 'Retirar guardado',
    { authenticated: true },
  );
operation('get', '/posts/{id}/comments', 'Listar comentarios y respuestas visibles', {
  response: 'CommentListItemPage',
  paginated: true,
});
operation('post', '/posts/{id}/comments', 'Comentar o responder en la misma publicación', {
  body: 'CreateCommentInput',
  response: 'Comment',
  status: 201,
  authenticated: true,
});
operation('patch', '/comments/{id}', 'Editar comentario propio', {
  body: 'UpdateCommentInput',
  response: 'Comment',
  authenticated: true,
});
operation(
  'delete',
  '/comments/{id}',
  'Eliminar comentario propio o moderar en publicación propia',
  { authenticated: true },
);
operation('put', '/comments/{id}/reaction', 'Establecer reacción a comentario', {
  body: 'ReactionInput',
  authenticated: true,
});
operation('delete', '/comments/{id}/reaction', 'Retirar reacción a comentario', {
  authenticated: true,
});
operation('get', '/communities', 'Buscar comunidades públicas o propias', {
  response: 'CommunityPage',
  paginated: true,
  filters: ['q', 'category'],
});
operation('post', '/communities', 'Crear comunidad con membresía de propietario', {
  body: 'CreateCommunityInput',
  response: 'Community',
  status: 201,
  authenticated: true,
});
operation('get', '/communities/{id}', 'Consultar comunidad visible', { response: 'Community' });
operation('patch', '/communities/{id}', 'Actualizar comunidad propia', {
  body: 'UpdateCommunityInput',
  response: 'Community',
  authenticated: true,
});
operation('delete', '/communities/{id}', 'Eliminar comunidad propia', { authenticated: true });
operation('get', '/communities/{id}/members', 'Listar miembros de comunidad visible', {
  response: 'CommunityMemberPage',
  paginated: true,
});
operation('put', '/communities/{id}/membership', 'Unirse a comunidad pública', {
  authenticated: true,
});
operation('delete', '/communities/{id}/membership', 'Abandonar comunidad sin ser propietario', {
  authenticated: true,
});
operation('put', '/communities/{id}/members/{userId}', 'Agregar miembro o cambiar rol', {
  body: 'MemberRoleInput',
  authenticated: true,
  description:
    'Propietario asigna member/moderator. Moderador solo administra miembros ordinarios. El propietario conserva su rol.',
});
operation('delete', '/communities/{id}/members/{userId}', 'Retirar miembro según jerarquía', {
  authenticated: true,
});
operation('get', '/notifications', 'Notificaciones propias con destinos aún visibles', {
  response: 'NotificationPage',
  paginated: true,
  authenticated: true,
  filters: ['unread'],
});
operation('put', '/notifications/read', 'Marcar todas las notificaciones propias como leídas', {
  authenticated: true,
});
operation('put', '/notifications/{id}/read', 'Marcar notificación propia como leída', {
  authenticated: true,
});
operation('get', '/conversations', 'Listar conversaciones directas propias', {
  response: 'ConversationListItemPage',
  paginated: true,
  authenticated: true,
});
operation('post', '/conversations/direct', 'Obtener o crear conversación directa única', {
  body: 'DirectConversationInput',
  response: 'Conversation',
  authenticated: true,
});
operation('get', '/conversations/{id}/messages', 'Listar mensajes de conversación propia', {
  response: 'MessagePage',
  paginated: true,
  authenticated: true,
});
operation(
  'post',
  '/conversations/{id}/messages',
  'Enviar mensaje o respuesta en la misma conversación',
  { body: 'SendMessageInput', response: 'Message', status: 201, authenticated: true },
);
operation('put', '/conversations/{id}/read', 'Marcar conversación como leída', {
  authenticated: true,
});
operation('patch', '/messages/{id}', 'Editar mensaje propio', {
  body: 'UpdateMessageInput',
  response: 'Message',
  authenticated: true,
});
operation('delete', '/messages/{id}', 'Eliminar mensaje propio', { authenticated: true });
operation('get', '/projects', 'Buscar proyectos visibles', {
  response: 'ProjectPage',
  paginated: true,
  filters: ['q', 'authorId'],
});
operation('post', '/projects', 'Crear proyecto de texto', {
  body: 'CreateProjectInput',
  response: 'Project',
  status: 201,
  authenticated: true,
});
operation('get', '/projects/{id}', 'Consultar proyecto visible', { response: 'Project' });
operation('patch', '/projects/{id}', 'Editar o publicar proyecto propio', {
  body: 'UpdateProjectInput',
  response: 'Project',
  authenticated: true,
});
operation('delete', '/projects/{id}', 'Eliminar proyecto propio', { authenticated: true });

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Nexo API',
    version: '0.2.0',
    description:
      'API de texto de Nexo. Cookies HttpOnly y cabecera X-Nexo-CSRF: 1 en mutaciones. Colecciones ordenadas por createdAt DESC e id DESC; los cursores están vinculados al usuario y filtros. El texto se devuelve como datos y debe renderizarse escapado. Las funciones de archivos y tiempo real no están implementadas.',
  },
  servers: [{ url: '/api/v1' }],
  paths,
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'nexo_session' } },
    schemas,
  },
};
