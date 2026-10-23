import { z } from 'zod';
import { request, HttpError } from './http-client';
import type { SocialApi } from './api';
import type { User, Post, Community, Notification, Project } from '../types';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  followersCount: z.number().optional(),
  followingCount: z.number().optional(),
  followed: z.boolean().optional(),
});
export const communitySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  visibility: z.enum(['public', 'private']),
  membersCount: z.number(),
  memberRole: z.enum(['owner', 'moderator', 'member']).nullable(),
});
export const postSchema = z.object({
  id: z.string(),
  author: userSchema,
  content: z.string().nullable(),
  createdAt: z.string(),
  communityId: z.string().nullable(),
  visibility: z.enum(['public', 'followers', 'community']),
  category: z.string().nullable(),
  reactionsCount: z.number(),
  commentsCount: z.number(),
  viewerReaction: z.string().nullable(),
  bookmarked: z.boolean(),
});
export const projectSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'followers']),
});
const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: userSchema,
  content: z.string(),
  createdAt: z.string(),
  parentId: z.string().nullable(),
  viewerReaction: z.string().nullable(),
  reactionsCount: z.number(),
});
const notificationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  actorHandle: z.string().nullable(),
  postId: z.string().nullable(),
  conversationId: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export const conversationSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  participantName: z.string(),
  participantHandle: z.string(),
  unreadCount: z.number(),
});
export const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  content: z.string().nullable(),
  replyToId: z.string().nullable(),
  createdAt: z.string(),
});
export const pageSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ items: z.array(schema), nextCursor: z.string().nullable().optional() });

export function changed() {
  window.dispatchEvent(new Event('nexo:data-changed'));
}
export function queryString(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params.size ? '?' + params.toString() : '';
}
export async function read<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const result = schema.safeParse(await request<unknown>(path, undefined, signal));
  if (!result.success) throw new Error('El servidor devolvió una respuesta no válida.');
  return result.data;
}
export async function mutate(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: unknown = {},
) {
  const result = await request<unknown>(path, body, undefined, method);
  changed();
  return result;
}
function userDto(row: z.infer<typeof userSchema>): User {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio || undefined,
    location: row.location || undefined,
    website: row.website || undefined,
    joinedAt: row.createdAt,
    followerCount: row.followersCount,
    followingCount: row.followingCount,
    followed: row.followed,
  };
}
export function postDto(row: z.infer<typeof postSchema>): Post {
  return {
    ...row,
    author: userDto(row.author),
    content: row.content || '',
    category: row.category || undefined,
    media: [],
    likeCount: row.reactionsCount,
    commentCount: row.commentsCount,
  };
}
function communityDto(row: z.infer<typeof communitySchema>): Community {
  return { ...row, category: row.category || undefined, memberCount: row.membersCount };
}
async function myId(signal?: AbortSignal) {
  return (await read('/auth/session', z.object({ user: userSchema }), signal)).user.id;
}
async function resolveId(id: string, signal?: AbortSignal) {
  return id === 'me' ? myId(signal) : id;
}
async function nullable<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
}
export const socialApi: SocialApi = {
  async getFeed(query, { signal }) {
    const authorId = query.authorId ? await resolveId(query.authorId, signal) : undefined;
    const page = await read(
      (query.kind === 'following' ? '/feed' : '/posts') +
        queryString({
          authorId,
          q: query.search,
          communityId: query.communityId,
          category: query.category,
          cursor: query.cursor,
        }),
      pageSchema(postSchema),
      signal,
    );
    return { items: page.items.map(postDto), nextCursor: page.nextCursor || undefined };
  },
  getProfile: (id, { signal }) =>
    nullable(async () =>
      userDto(
        await read('/users/' + (id === 'me' ? 'me' : encodeURIComponent(id)), userSchema, signal),
      ),
    ),
  async getPeople(search, { signal, cursor }) {
    const page = await read(
      '/users' + queryString({ q: search, cursor }),
      pageSchema(userSchema),
      signal,
    );
    return { items: page.items.map(userDto), nextCursor: page.nextCursor || undefined };
  },
  async getProjects(id, { signal, cursor }) {
    const authorId = await resolveId(id, signal);
    const [page, author] = await Promise.all([
      read('/projects' + queryString({ authorId, cursor }), pageSchema(projectSchema), signal),
      read('/users/' + authorId, userSchema, signal),
    ]);
    return {
      items: page.items.map((row): Project => ({ ...row, author: userDto(author) })),
      nextCursor: page.nextCursor || undefined,
    };
  },
  async getCommunities(query, { signal, cursor }) {
    const page = await read(
      '/communities' + queryString({ q: query.search, category: query.category, cursor }),
      pageSchema(communitySchema),
      signal,
    );
    return { items: page.items.map(communityDto), nextCursor: page.nextCursor || undefined };
  },
  getCommunity: (id, { signal }) =>
    nullable(async () =>
      communityDto(await read('/communities/' + encodeURIComponent(id), communitySchema, signal)),
    ),
  async getCommunityMembers(id, { signal, cursor }) {
    const page = await read(
      `/communities/${encodeURIComponent(id)}/members` + queryString({ cursor }),
      pageSchema(userSchema),
      signal,
    );
    return { items: page.items.map(userDto), nextCursor: page.nextCursor || undefined };
  },
  async getNotifications(filter, { signal, cursor }) {
    const page = await read(
      '/notifications' + queryString({ unread: filter === 'unread' ? 'true' : undefined, cursor }),
      pageSchema(notificationSchema),
      signal,
    );
    const text: Record<string, string> = {
      follow: 'empezó a seguirte',
      post_reaction: 'reaccionó a tu publicación',
      comment_reaction: 'reaccionó a tu comentario',
      comment: 'comentó tu publicación',
      reply: 'respondió a tu comentario',
      message: 'te envió un mensaje',
    };
    return {
      nextCursor: page.nextCursor || undefined,
      items: page.items.map((row): Notification => ({
        id: row.id,
        createdAt: row.createdAt,
        read: !!row.readAt,
        actor: row.actorId
          ? { id: row.actorId, name: row.actorName || 'Usuario', handle: row.actorHandle || '' }
          : undefined,
        text: `${row.actorName || 'Nexo'} ${text[row.kind] || 'tiene una novedad para vos'}.`,
        kind: row.kind.includes('reaction')
          ? 'like'
          : ['comment', 'reply', 'message'].includes(row.kind)
            ? 'comment'
            : row.kind === 'follow'
              ? 'follow'
              : 'community',
        href: row.conversationId
          ? '/mensajes?conversacion=' + row.conversationId
          : row.postId
            ? '/publicacion/' + row.postId
            : row.actorId
              ? '/perfil/' + row.actorId
              : undefined,
      })),
    };
  },
  async getComments(id, { signal, cursor }) {
    const page = await read(
      `/posts/${encodeURIComponent(id)}/comments` + queryString({ cursor }),
      pageSchema(commentSchema),
      signal,
    );
    return {
      items: page.items.map((row) => ({ ...row, author: userDto(row.author) })),
      nextCursor: page.nextCursor || undefined,
    };
  },
  async createPost(input, { signal }) {
    if (input.image) throw new Error('La subida de imágenes todavía no está configurada.');
    const result = postSchema.parse(
      await request<unknown>('/posts', { content: input.content }, signal),
    );
    changed();
    return postDto(result);
  },
};

export const socialActions = {
  createPost: async (input: {
    content: string;
    visibility?: string;
    communityId?: string;
    category?: string;
  }) => postDto(postSchema.parse(await mutate('/posts', 'POST', input))),
  updatePost: (id: string, content: string) => mutate(`/posts/${id}`, 'PATCH', { content }),
  deletePost: (id: string) => mutate(`/posts/${id}`, 'DELETE'),
  reaction: (id: string, active: boolean) =>
    mutate(`/posts/${id}/reaction`, active ? 'PUT' : 'DELETE', active ? { reaction: 'like' } : {}),
  bookmark: (id: string, active: boolean) =>
    mutate(`/posts/${id}/bookmark`, active ? 'PUT' : 'DELETE'),
  comment: (id: string, content: string, parentId?: string) =>
    mutate(`/posts/${id}/comments`, 'POST', { content, parentId }),
  deleteComment: (id: string) => mutate(`/comments/${id}`, 'DELETE'),
  updateComment: (id: string, content: string) => mutate(`/comments/${id}`, 'PATCH', { content }),
  reactComment: (id: string, active: boolean) =>
    mutate(
      `/comments/${id}/reaction`,
      active ? 'PUT' : 'DELETE',
      active ? { reaction: 'like' } : {},
    ),
  follow: (id: string, active: boolean) => mutate(`/users/${id}/follow`, active ? 'PUT' : 'DELETE'),
  membership: (id: string, active: boolean) =>
    mutate(`/communities/${id}/membership`, active ? 'PUT' : 'DELETE'),
  readNotifications: (id?: string) =>
    mutate(id ? `/notifications/${id}/read` : '/notifications/read', 'PUT'),
};
